import type { EnrichedRequest, AdFlow, HeaderBiddingSetup, HeaderBiddingAnalysis, BidLatencyAnalysis, BidLatencyMetrics, ConflictDetection } from '../types';

// Configuration thresholds
const LATENCY_THRESHOLDS = {
  SLOW_VENDOR_MS: 3000, // Vendors with avg > 3s are "slow"
  TIMEOUT_MS: 10000, // Requests > 10s are timeouts
  TIMEOUT_RATE_WARNING: 0.1, // 10% timeout rate triggers warning
};

/**
 * Detect header bidding setup type
 */
export function detectHeaderBiddingSetup(requests: EnrichedRequest[]): HeaderBiddingSetup {
  let prebidDetected = false;
  let prebidServerDetected = false;
  let otherHeaderBiddingDetected = false;
  let waterfallOnly = true;

  for (const request of requests) {
    // Check for Prebid.js by vendor ID (most reliable)
    if (request.vendor?.id === 'prebid') {
      prebidDetected = true;
      waterfallOnly = false;
    }

    // Check for Prebid.js script loads
    if (request.type === 'script' && request.url.includes('prebid')) {
      prebidDetected = true;
      waterfallOnly = false;
    }

    // Check for Prebid auction stage
    if (request.adFlowStage === 'prebid_auction') {
      prebidDetected = true;
      waterfallOnly = false;
    }

    // Check for Prebid Server by vendor ID (most reliable)
    if (request.vendor?.id === 'prebid-server') {
      prebidServerDetected = true;
      waterfallOnly = false;
    }

    // Check for Prebid Server by URL patterns
    if (request.url.includes('/pbs/v1/openrtb2/auction') ||
        (request.url.includes('/openrtb2/auction') && request.url.includes('prebid'))) {
      prebidServerDetected = true;
      waterfallOnly = false;
    }

    // Check for Prebid Server by category and bid request type
    if (request.vendor?.category === 'Prebid' && 
        (request.vendorRequestType === 'bid_request' || request.adFlowStage === 'bid_request')) {
      // Distinguish between Prebid.js and Prebid Server
      if (request.url.includes('/pbs/') || request.url.includes('/openrtb2/auction')) {
        prebidServerDetected = true;
      } else {
        prebidDetected = true;
      }
      waterfallOnly = false;
    }

    // Check for other header bidding wrappers
    // Amazon TAM/UAM
    if (request.vendor?.id === 'amazon-tam' && request.vendorRequestType === 'bid_request') {
      otherHeaderBiddingDetected = true;
      waterfallOnly = false;
    }

    // Check for bid requests that happen before ad server calls
    // This indicates header bidding (bids come before waterfall)
    if (request.adFlowStage === 'bid_request' || request.vendorRequestType === 'bid_request') {
      // If we see bid requests, it's likely header bidding
      if (request.vendor?.category === 'SSP' || request.vendor?.category === 'DSP') {
        otherHeaderBiddingDetected = true;
        waterfallOnly = false;
      }
    }
  }

  // Determine setup type
  let result: HeaderBiddingSetup;
  if (prebidDetected && prebidServerDetected) {
    result = 'mixed'; // Both client and server-side Prebid
  } else if (prebidDetected) {
    result = 'prebid';
  } else if (prebidServerDetected) {
    result = 'prebid-server';
  } else if (otherHeaderBiddingDetected) {
    result = 'other-header-bidding';
  } else if (waterfallOnly) {
    result = 'waterfall-only';
  } else {
    result = 'unknown';
  }
  
  return result;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((sortedArray.length - 1) * p);
  return sortedArray[index] || 0;
}

/**
 * Analyze bid latency patterns
 */
export function analyzeBidLatency(requests: EnrichedRequest[]): BidLatencyAnalysis {
  // Filter to bid requests and responses
  const bidRequests = requests.filter(r => 
    r.vendorRequestType === 'bid_request' || 
    r.adFlowStage === 'bid_request' ||
    r.adFlowStage === 'prebid_auction'
  );

  const bidResponses = requests.filter(r => 
    r.vendorRequestType === 'bid_response' ||
    (r.vendorRequestType === 'bid_request' && r.completed && r.statusCode === 200)
  );

  // Group by vendor
  const vendorMetrics = new Map<string, {
    requests: EnrichedRequest[];
    responses: EnrichedRequest[];
    latencies: number[];
  }>();

  for (const request of bidRequests) {
    if (!request.vendor) continue;
    const vendorId = request.vendor.id;
    
    if (!vendorMetrics.has(vendorId)) {
      vendorMetrics.set(vendorId, { requests: [], responses: [], latencies: [] });
    }
    vendorMetrics.get(vendorId)!.requests.push(request);
  }

  // Match responses to requests and calculate latencies
  for (const response of bidResponses) {
    if (!response.vendor) continue;
    const vendorId = response.vendor.id;
    
    const metrics = vendorMetrics.get(vendorId);
    if (metrics) {
      metrics.responses.push(response);
      
      // Try to find matching request
      if (response.duration !== undefined && response.duration > 0) {
        metrics.latencies.push(response.duration);
      } else {
        // Try to match by URL pattern or timing
        const matchingRequest = metrics.requests.find(r => 
          r.url === response.url || 
          (Math.abs(r.timestamp - response.timestamp) < 5000)
        );
        if (matchingRequest && response.timestamp && matchingRequest.timestamp) {
          const latency = response.timestamp - matchingRequest.timestamp;
          if (latency > 0 && latency < 60000) { // Reasonable range
            metrics.latencies.push(latency);
          }
        }
      }
    }
  }

  // Calculate metrics per vendor
  const byVendor: BidLatencyMetrics[] = [];
  const slowVendors: string[] = [];
  const timeoutVendors: string[] = [];

  for (const [vendorId, metrics] of vendorMetrics) {
    const vendor = metrics.requests[0]?.vendor;
    const vendorName = vendor?.name || vendorId;

    const requestCount = metrics.requests.length;
    const responseCount = metrics.responses.length;
    const timeoutCount = metrics.requests.filter(r => 
      r.error || 
      (r.duration !== undefined && r.duration > LATENCY_THRESHOLDS.TIMEOUT_MS) ||
      (!r.completed && Date.now() - r.timestamp > LATENCY_THRESHOLDS.TIMEOUT_MS)
    ).length;

    const latencies = metrics.latencies.sort((a, b) => a - b);
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;
    const minLatency = latencies.length > 0 ? latencies[0] : 0;
    const maxLatency = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
    const p95Latency = percentile(latencies, 0.95);
    const timeoutRate = requestCount > 0 ? timeoutCount / requestCount : 0;

    const metricsObj: BidLatencyMetrics = {
      vendor: vendorName,
      requestCount,
      responseCount,
      avgLatency,
      minLatency,
      maxLatency,
      p95Latency,
      timeoutCount,
      timeoutRate,
    };

    byVendor.push(metricsObj);

    if (avgLatency > LATENCY_THRESHOLDS.SLOW_VENDOR_MS) {
      slowVendors.push(vendorName);
    }
    if (timeoutRate > LATENCY_THRESHOLDS.TIMEOUT_RATE_WARNING) {
      timeoutVendors.push(vendorName);
    }
  }

  // Calculate overall metrics
  const allLatencies = Array.from(vendorMetrics.values())
    .flatMap(m => m.latencies)
    .sort((a, b) => a - b);
  
  const totalBidRequests = bidRequests.length;
  const totalBidResponses = bidResponses.length;
  const responseRate = totalBidRequests > 0 ? totalBidResponses / totalBidRequests : 0;
  const avgLatency = allLatencies.length > 0
    ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
    : 0;

  return {
    overall: {
      totalBidRequests,
      totalBidResponses,
      responseRate,
      avgLatency,
    },
    byVendor: byVendor.sort((a, b) => b.requestCount - a.requestCount),
    slowVendors,
    timeoutVendors,
  };
}

/**
 * Detect conflicts between header bidding and waterfall
 */
export function detectWaterfallConflicts(flows: AdFlow[]): ConflictDetection[] {
  const conflicts: ConflictDetection[] = [];

  for (const flow of flows) {
    const stages = Array.from(flow.stages.keys());
    const hasHeaderBidding = stages.includes('prebid_auction') || 
                             stages.includes('bid_request');
    const hasWaterfall = stages.includes('ad_server');

    if (!hasHeaderBidding || !hasWaterfall) {
      continue; // No conflict if both aren't present
    }

    // Get request timestamps for timing analysis
    const prebidRequests = flow.stages.get('prebid_auction') || [];
    const bidRequests = flow.stages.get('bid_request') || [];
    const adServerRequests = flow.stages.get('ad_server') || [];

    const hbRequests = [...prebidRequests, ...bidRequests];
    const hbEndTime = hbRequests.length > 0
      ? Math.max(...hbRequests.map(r => r.timestamp + (r.duration || 0)))
      : 0;
    const waterfallStartTime = adServerRequests.length > 0
      ? Math.min(...adServerRequests.map(r => r.timestamp))
      : Infinity;

    // Conflict 1: Waterfall ad server called before header bidding completes
    if (waterfallStartTime < hbEndTime && hbEndTime > 0) {
      const timeDiff = hbEndTime - waterfallStartTime;
      conflicts.push({
        type: 'waterfall_before_hb',
        severity: 'error',
        message: 'Waterfall ad server called before header bidding completed',
        flowId: flow.id,
        slotId: flow.slotId,
        details: `Ad server request started ${Math.round(timeDiff)}ms before header bidding completed. This may cause header bidding bids to be ignored.`,
        relatedRequestIds: [
          ...adServerRequests.map(r => r.id),
          ...hbRequests.map(r => r.id),
        ],
      });
    }

    // Conflict 2: Duplicate serving (both HB and waterfall serving same slot)
    // This is detected if we have both bid responses AND ad server requests
    const bidResponses = flow.stages.get('bid_response') || [];
    if (bidResponses.length > 0 && adServerRequests.length > 0) {
      // Check if they're serving the same slot
      const hbSlotIds = new Set([
        ...hbRequests.map(r => r.slotId).filter(Boolean),
        ...bidResponses.map(r => r.slotId).filter(Boolean),
      ]);
      const waterfallSlotIds = new Set(
        adServerRequests.map(r => r.slotId).filter(Boolean)
      );

      // Check for overlap
      const hasOverlap = Array.from(hbSlotIds).some(id => waterfallSlotIds.has(id));
      if (hasOverlap || flow.slotId) {
        conflicts.push({
          type: 'duplicate_serving',
          severity: 'warning',
          message: 'Both header bidding and waterfall serving same ad slot',
          flowId: flow.id,
          slotId: flow.slotId,
          details: `This ad slot appears to be served by both header bidding (${bidResponses.length} bid response(s)) and waterfall (${adServerRequests.length} ad server request(s)). This may cause duplicate impressions.`,
          relatedRequestIds: [
            ...bidResponses.map(r => r.id),
            ...adServerRequests.map(r => r.id),
          ],
        });
      }
    }

    // Conflict 3: Timing conflict (waterfall too close to HB completion)
    if (waterfallStartTime > hbEndTime && hbEndTime > 0) {
      const timeDiff = waterfallStartTime - hbEndTime;
      // If waterfall starts within 100ms of HB completion, it might be a race condition
      if (timeDiff < 100) {
        conflicts.push({
          type: 'timing_conflict',
          severity: 'warning',
          message: 'Potential timing race condition between header bidding and waterfall',
          flowId: flow.id,
          slotId: flow.slotId,
          details: `Waterfall ad server request started ${Math.round(timeDiff)}ms after header bidding completed. This tight timing may cause race conditions.`,
          relatedRequestIds: [
            ...adServerRequests.map(r => r.id),
            ...hbRequests.map(r => r.id),
          ],
        });
      }
    }
  }

  return conflicts;
}

/**
 * Generate comprehensive header bidding analysis
 */
export function generateHeaderBiddingAnalysis(
  requests: EnrichedRequest[],
  flows: AdFlow[]
): HeaderBiddingAnalysis {
  let setup: HeaderBiddingSetup;
  try {
    setup = detectHeaderBiddingSetup(requests);
  } catch (error) {
    setup = 'unknown';
  }
  
  // Also directly check requests for more accurate detection
  let directPrebidDetected = false;
  let directPrebidServerDetected = false;
  
  for (const request of requests) {
    // Direct Prebid.js detection
    if (request.vendor?.id === 'prebid' || 
        (request.vendor?.category === 'Prebid' && request.vendor?.name?.toLowerCase().includes('prebid.js'))) {
      directPrebidDetected = true;
    }
    
    // Direct Prebid Server detection
    if (request.vendor?.id === 'prebid-server' ||
        (request.vendor?.category === 'Prebid' && 
         (request.url.includes('/pbs/') || request.url.includes('/openrtb2/auction')))) {
      directPrebidServerDetected = true;
    }
  }
  
  // Use direct detection if setup detection didn't catch it
  const prebidDetected = directPrebidDetected || setup === 'prebid' || setup === 'mixed';
  const prebidServerDetected = directPrebidServerDetected || setup === 'prebid-server' || setup === 'mixed';
  
  let latencyAnalysis: BidLatencyAnalysis;
  let conflicts: ConflictDetection[];
  try {
    latencyAnalysis = analyzeBidLatency(requests);
    conflicts = detectWaterfallConflicts(flows);
  } catch (error) {
    latencyAnalysis = {
      overall: { totalBidRequests: 0, totalBidResponses: 0, responseRate: 0, avgLatency: 0 },
      byVendor: [],
      slowVendors: [],
      timeoutVendors: [],
    };
    conflicts = [];
  }

  const result = {
    setup,
    prebidDetected,
    prebidServerDetected,
    latencyAnalysis,
    conflicts,
    timestamp: Date.now(),
  };

  return result;
}

