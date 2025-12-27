import type { EnrichedRequest, AdFlowStage, AdFlow, Issue } from '../types';

// Time window for grouping requests into the same ad flow (ms)
const FLOW_GROUPING_WINDOW = 5000;

/**
 * Determine the ad flow stage for a request based on vendor and request type
 */
export function detectAdFlowStage(request: EnrichedRequest): AdFlowStage {
  const { vendor, vendorRequestType, url } = request;

  // Check by vendor category first
  if (vendor) {
    switch (vendor.category) {
      case 'Prebid':
        if (url.includes('prebid') || url.includes('auction')) {
          return 'prebid_auction';
        }
        return 'bid_request';

      case 'SSP':
        if (vendorRequestType === 'bid_request') return 'bid_request';
        if (vendorRequestType === 'impression') return 'impression';
        if (vendorRequestType === 'viewability') return 'viewability';
        if (vendorRequestType === 'sync') return 'identity_sync';
        // Check URL patterns for bid responses
        if (url.includes('bid') || url.includes('auction')) {
          return 'bid_request';
        }
        return 'other';

      case 'DSP':
        if (vendorRequestType === 'bid_request') return 'bid_request';
        return 'creative_render';

      case 'AdServer':
        return 'ad_server';

      case 'Verification':
        return 'verification';

      case 'Measurement':
        if (vendorRequestType === 'viewability') return 'viewability';
        if (vendorRequestType === 'impression') return 'impression';
        return 'verification';

      case 'Identity':
        return 'identity_sync';

      case 'CDN':
        // CDN requests are usually creative assets
        if (request.type === 'image' || request.type === 'media') {
          return 'creative_render';
        }
        return 'other';
    }
  }

  // Check by request type
  if (vendorRequestType) {
    switch (vendorRequestType) {
      case 'bid_request': return 'bid_request';
      case 'bid_response': return 'bid_response';
      case 'impression': return 'impression';
      case 'viewability': return 'viewability';
      case 'click': return 'click';
      case 'sync': return 'identity_sync';
      case 'creative': return 'creative_render';
    }
  }

  // Check for GAM/ad server patterns
  if (url.includes('doubleclick.net/gampad') || url.includes('googlesyndication.com/pagead')) {
    return 'ad_server';
  }

  // Check for creative/media content
  if (request.type === 'image' || request.type === 'media' || request.type === 'sub_frame') {
    if (url.includes('creative') || url.includes('ad') || url.includes('banner')) {
      return 'creative_render';
    }
  }

  return 'other';
}

/**
 * Extract ad slot identifier from request URL or payload
 */
export function extractSlotId(request: EnrichedRequest): string | undefined {
  const { url, decodedPayload, requestBody } = request;

  // Try to extract from URL parameters
  try {
    const urlObj = new URL(url);

    // Common slot ID parameters
    const slotParams = ['slot', 'slotname', 'ad_slot', 'adslot', 'iu', 'ad_unit', 'adunit', 'div', 'divid', 'placement'];
    for (const param of slotParams) {
      const value = urlObj.searchParams.get(param);
      if (value) return value;
    }

    // GAM ad unit path pattern
    const iuMatch = url.match(/[?&]iu=([^&]+)/);
    if (iuMatch) {
      return decodeURIComponent(iuMatch[1]);
    }

    // Prebid ad unit code
    const adUnitMatch = url.match(/adUnitCode[=:]([^&,]+)/i);
    if (adUnitMatch) {
      return adUnitMatch[1];
    }
  } catch {
    // URL parsing failed
  }

  // Try to extract from decoded payload (URL params) or request body (POST data)
  const payloads = [decodedPayload, requestBody].filter(Boolean);

  for (const payload of payloads) {
    if (payload && typeof payload.data === 'object') {
      const data = payload.data as Record<string, unknown>;

      // Check for OpenRTB imp array
      if (data.imp && Array.isArray(data.imp) && data.imp.length > 0) {
        const imp = data.imp[0] as Record<string, unknown>;

        // Check ext first for more specific identifiers
        if (imp.ext && typeof imp.ext === 'object') {
          const ext = imp.ext as Record<string, unknown>;

          // Primary: gpid (Global Placement ID) - most specific
          if (ext.gpid) {
            return String(ext.gpid);
          }

          // pbadslot from ext.data
          if (ext.data && typeof ext.data === 'object') {
            const extData = ext.data as Record<string, unknown>;
            if (extData.pbadslot) {
              return String(extData.pbadslot);
            }
          }

          // adunitcode from ext.prebid
          if (ext.prebid && typeof ext.prebid === 'object') {
            const prebid = ext.prebid as Record<string, unknown>;
            if (prebid.adunitcode) {
              return String(prebid.adunitcode);
            }
          }
        }

        // Fallback: tagid (less specific, may be shared across slots)
        if (imp.tagid) {
          return String(imp.tagid);
        }
      }

      // Check for common slot ID fields at root level
      const slotFields = ['slotId', 'slot', 'adSlot', 'adUnitCode', 'placementId', 'tagId'];
      for (const field of slotFields) {
        if (data[field]) return String(data[field]);
      }
    }
  }

  return undefined;
}

/**
 * Extract winning bid information from a request
 */
export function extractWinningBid(request: EnrichedRequest): { vendor: string; price?: number; currency?: string } | undefined {
  const { url, decodedPayload, vendor } = request;

  // Check for price in URL
  const priceMatch = url.match(/(?:price|cpm|bid)[=:]([0-9.]+)/i);
  const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;

  // Check for currency
  const currencyMatch = url.match(/(?:cur|currency)[=:]([A-Z]{3})/i);
  const currency = currencyMatch ? currencyMatch[1] : undefined;

  if (vendor && (price !== undefined || request.adFlowStage === 'ad_server')) {
    return {
      vendor: vendor.name,
      price,
      currency,
    };
  }

  return undefined;
}

/**
 * Group requests into ad flows
 */
export function groupRequestsIntoFlows(requests: EnrichedRequest[]): AdFlow[] {
  if (requests.length === 0) return [];

  // First, assign stages and extract slot IDs for all requests
  const enrichedRequests = requests.map(req => ({
    ...req,
    adFlowStage: req.adFlowStage || detectAdFlowStage(req),
    slotId: req.slotId || extractSlotId(req),
  }));

  // Sort by timestamp
  enrichedRequests.sort((a, b) => a.timestamp - b.timestamp);

  // Group by slot ID and time proximity
  const flows: AdFlow[] = [];
  const slotFlowMap = new Map<string, AdFlow>();
  let unassignedFlow: AdFlow | null = null;

  for (const request of enrichedRequests) {
    const slotId = request.slotId;

    if (slotId) {
      // Check if we have an existing flow for this slot within the time window
      const existingFlow = slotFlowMap.get(slotId);

      if (existingFlow && request.timestamp - existingFlow.startTime < FLOW_GROUPING_WINDOW) {
        // Add to existing flow
        addRequestToFlow(existingFlow, request);
      } else {
        // Create new flow for this slot
        const newFlow = createFlow(slotId, request);
        slotFlowMap.set(slotId, newFlow);
        flows.push(newFlow);
      }
    } else {
      // No slot ID - try to match by timing with recent flows
      let matched = false;

      // Look for a flow within the time window
      for (const flow of [...flows].reverse()) {
        if (request.timestamp - flow.startTime < FLOW_GROUPING_WINDOW) {
          // Check if this request type makes sense for this flow
          if (canBelongToFlow(request, flow)) {
            addRequestToFlow(flow, request);
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        // Create or add to unassigned flow
        if (!unassignedFlow || request.timestamp - unassignedFlow.startTime > FLOW_GROUPING_WINDOW) {
          unassignedFlow = createFlow(undefined, request);
          flows.push(unassignedFlow);
        } else {
          addRequestToFlow(unassignedFlow, request);
        }
      }
    }
  }

  // Sort flows by start time
  flows.sort((a, b) => a.startTime - b.startTime);

  // Detect winning bids and collect issues
  for (const flow of flows) {
    detectFlowWinner(flow);
    collectFlowIssues(flow);
  }

  return flows;
}

/**
 * Create a new ad flow
 */
function createFlow(slotId: string | undefined, firstRequest: EnrichedRequest): AdFlow {
  const flow: AdFlow = {
    id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    slotId,
    startTime: firstRequest.timestamp,
    requests: [],
    stages: new Map(),
    issues: [],
  };

  addRequestToFlow(flow, firstRequest);
  return flow;
}

/**
 * Add a request to a flow
 */
function addRequestToFlow(flow: AdFlow, request: EnrichedRequest): void {
  flow.requests.push(request);

  // Update end time
  const requestEnd = request.timestamp + (request.duration || 0);
  if (!flow.endTime || requestEnd > flow.endTime) {
    flow.endTime = requestEnd;
  }

  // Add to stage group
  const stage = request.adFlowStage || 'other';
  if (!flow.stages.has(stage)) {
    flow.stages.set(stage, []);
  }
  flow.stages.get(stage)!.push(request);

  // Extract ad unit path from GAM requests
  if (stage === 'ad_server' && !flow.adUnitPath) {
    const iuMatch = request.url.match(/[?&]iu=([^&]+)/);
    if (iuMatch) {
      flow.adUnitPath = decodeURIComponent(iuMatch[1]);
    }
  }
}

/**
 * Check if a request can logically belong to a flow
 */
function canBelongToFlow(request: EnrichedRequest, flow: AdFlow): boolean {
  const stage = request.adFlowStage;

  // Identity sync and verification can belong to any flow
  if (stage === 'identity_sync' || stage === 'verification' || stage === 'other') {
    return true;
  }

  // Check stage progression - later stages shouldn't precede early stages
  const flowStages = Array.from(flow.stages.keys());

  // If flow has ad_server or later, don't add bid_request
  if (stage === 'bid_request') {
    if (flowStages.some(s => ['ad_server', 'creative_render', 'impression', 'viewability'].includes(s))) {
      return false;
    }
  }

  return true;
}

/**
 * Detect the winning bid in a flow
 */
function detectFlowWinner(flow: AdFlow): void {
  // Look for winning bid indicators in ad server or impression requests
  const adServerRequests = flow.stages.get('ad_server') || [];
  const impressionRequests = flow.stages.get('impression') || [];

  for (const request of [...adServerRequests, ...impressionRequests]) {
    const winningBid = extractWinningBid(request);
    if (winningBid && winningBid.price) {
      flow.winningBid = winningBid;
      break;
    }
  }

  // If no price found, try to identify winner by vendor of creative
  if (!flow.winningBid) {
    const creativeRequests = flow.stages.get('creative_render') || [];
    for (const request of creativeRequests) {
      if (request.vendor && request.vendor.category !== 'CDN') {
        flow.winningBid = { vendor: request.vendor.name };
        break;
      }
    }
  }
}

/**
 * Collect issues from all requests in a flow
 */
function collectFlowIssues(flow: AdFlow): void {
  for (const request of flow.requests) {
    if (request.issues) {
      flow.issues.push(...request.issues);
    }
  }
}

/**
 * Get a summary of flows for display
 */
export function getFlowSummary(flows: AdFlow[]): {
  total: number;
  withIssues: number;
  withWinningBid: number;
  bySlot: Map<string, number>;
} {
  const summary = {
    total: flows.length,
    withIssues: 0,
    withWinningBid: 0,
    bySlot: new Map<string, number>(),
  };

  for (const flow of flows) {
    if (flow.issues.length > 0) summary.withIssues++;
    if (flow.winningBid) summary.withWinningBid++;

    const slot = flow.slotId || 'unknown';
    summary.bySlot.set(slot, (summary.bySlot.get(slot) || 0) + 1);
  }

  return summary;
}
