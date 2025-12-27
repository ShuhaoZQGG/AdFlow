import type { EnrichedRequest, Issue, IssueType } from '../types';

// Configuration thresholds
export const ISSUE_THRESHOLDS = {
  TIMEOUT_MS: 10000, // 10 seconds
  SLOW_RESPONSE_MS: 3000, // 3 seconds
  DUPLICATE_WINDOW_MS: 1000, // 1 second window for duplicate detection
};

/**
 * Detect timeout issues (requests taking too long)
 */
export function detectTimeout(request: EnrichedRequest): Issue | null {
  if (!request.completed && request.duration === undefined) {
    const elapsed = Date.now() - request.timestamp;
    if (elapsed > ISSUE_THRESHOLDS.TIMEOUT_MS) {
      return {
        type: 'timeout',
        severity: 'error',
        message: 'Request timed out',
        details: `Request has been pending for ${Math.round(elapsed / 1000)}s`,
      };
    }
  }
  return null;
}

/**
 * Detect slow response issues
 */
export function detectSlowResponse(request: EnrichedRequest): Issue | null {
  if (request.completed && request.duration) {
    if (request.duration > ISSUE_THRESHOLDS.SLOW_RESPONSE_MS) {
      return {
        type: 'slow_response',
        severity: 'warning',
        message: 'Slow response time',
        details: `Response took ${Math.round(request.duration)}ms (threshold: ${ISSUE_THRESHOLDS.SLOW_RESPONSE_MS}ms)`,
      };
    }
  }
  return null;
}

/**
 * Detect failed request issues
 */
export function detectFailedRequest(request: EnrichedRequest): Issue | null {
  if (request.error) {
    return {
      type: 'failed',
      severity: 'error',
      message: 'Request failed',
      details: request.error,
    };
  }

  if (request.statusCode && request.statusCode >= 400) {
    return {
      type: 'failed',
      severity: request.statusCode >= 500 ? 'error' : 'warning',
      message: `HTTP ${request.statusCode} error`,
      details: `Request returned status code ${request.statusCode}`,
    };
  }

  return null;
}

/**
 * Common ad-tech parameters that identify unique placements/creatives
 * These should be included in the duplicate signature to avoid false positives
 */
const PLACEMENT_IDENTIFIER_PARAMS = [
  // Network/placement identifiers
  'nid',          // Network ID (Rubicon, etc.)
  'v',            // Vendor/version ID (Rubicon)
  'pid',          // Placement ID
  'placement',
  'placement_id',
  'placementid',
  'slot',         // Ad slot
  'slotid',
  'slot_id',
  'zone',         // Zone ID
  'zoneid',
  'zone_id',
  'pos',          // Position

  // Creative identifiers
  'cid',          // Creative ID
  'creative',
  'creative_id',
  'creativeid',
  'aid',          // Ad ID
  'ad_id',
  'adid',

  // Line item / campaign identifiers
  'lid',          // Line Item ID
  'line_item_id',
  'lineitemid',
  'campaign',
  'campaign_id',
  'campaignid',

  // Tag identifiers
  'tag_id',
  'tagid',
  'tag',

  // Size (different sizes = different placements)
  'size',
  'sz',
];

/**
 * Signature for identifying duplicate pixels
 */
function getPixelSignature(request: EnrichedRequest): string | null {
  // Only check impression and viewability requests
  if (
    request.vendorRequestType !== 'impression' &&
    request.vendorRequestType !== 'viewability'
  ) {
    return null;
  }

  try {
    const url = new URL(request.url);
    const vendorId = request.vendor?.id || 'unknown';

    // Extract placement/creative identifiers from query params
    const identifiers: string[] = [];
    for (const param of PLACEMENT_IDENTIFIER_PARAMS) {
      const value = url.searchParams.get(param);
      if (value) {
        identifiers.push(`${param}=${value}`);
      }
    }

    // Create signature from vendor + path + placement identifiers
    // If no identifiers found, use just vendor + path (legacy behavior)
    const identifierStr = identifiers.length > 0 ? `:${identifiers.sort().join('&')}` : '';
    return `${vendorId}:${url.pathname}${identifierStr}`;
  } catch {
    return null;
  }
}

/**
 * Detect duplicate pixel fires
 */
export function detectDuplicatePixels(
  requests: EnrichedRequest[]
): Map<string, Issue> {
  const issues = new Map<string, Issue>();
  const pixelMap = new Map<string, EnrichedRequest[]>();

  // Group by pixel signature
  for (const request of requests) {
    const signature = getPixelSignature(request);
    if (!signature) continue;

    if (!pixelMap.has(signature)) {
      pixelMap.set(signature, []);
    }
    pixelMap.get(signature)!.push(request);
  }

  // Find duplicates within time window
  for (const [signature, matchingRequests] of pixelMap) {
    if (matchingRequests.length < 2) continue;

    // Sort by timestamp
    matchingRequests.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 1; i < matchingRequests.length; i++) {
      const current = matchingRequests[i];
      const previous = matchingRequests[i - 1];
      const timeDiff = current.timestamp - previous.timestamp;

      if (timeDiff < ISSUE_THRESHOLDS.DUPLICATE_WINDOW_MS) {
        const issue: Issue = {
          type: 'duplicate_pixel',
          severity: 'warning',
          message: 'Duplicate pixel detected',
          details: `${current.vendorRequestType} pixel fired ${Math.round(timeDiff)}ms after previous (vendor: ${current.vendor?.name || 'Unknown'})`,
          relatedRequestIds: [previous.id, current.id],
        };
        issues.set(current.id, issue);
      }
    }
  }

  return issues;
}

/**
 * Track beacon ordering for out-of-order detection
 */
interface BeaconSequence {
  impression?: { requestId: string; timestamp: number };
  viewability?: { requestId: string; timestamp: number };
}

/**
 * Detect out-of-order beacon firing (viewability before impression)
 */
export function detectOutOfOrderBeacons(
  requests: EnrichedRequest[]
): Map<string, Issue> {
  const issues = new Map<string, Issue>();

  // Group by vendor for ordering analysis
  const vendorBeacons = new Map<string, BeaconSequence>();

  for (const request of requests) {
    if (!request.vendor) continue;

    const vendorId = request.vendor.id;

    if (!vendorBeacons.has(vendorId)) {
      vendorBeacons.set(vendorId, {});
    }

    const sequence = vendorBeacons.get(vendorId)!;

    if (request.vendorRequestType === 'impression') {
      // If we already have a viewability beacon that fired BEFORE this impression
      if (sequence.viewability && sequence.viewability.timestamp < request.timestamp) {
        // The viewability fired before impression - this is the problem
        const issue: Issue = {
          type: 'out_of_order',
          severity: 'error',
          message: 'Viewability fired before impression',
          details: `${request.vendor.name}: Viewability beacon fired ${Math.round(request.timestamp - sequence.viewability.timestamp)}ms before impression pixel. This may cause measurement discrepancies.`,
          relatedRequestIds: [sequence.viewability.requestId, request.id],
        };
        issues.set(sequence.viewability.requestId, issue);
      }

      sequence.impression = { requestId: request.id, timestamp: request.timestamp };
    }

    if (request.vendorRequestType === 'viewability') {
      // If no impression yet, or viewability fires before impression timestamp
      if (sequence.impression && request.timestamp < sequence.impression.timestamp) {
        // Viewability firing before impression
        const issue: Issue = {
          type: 'out_of_order',
          severity: 'error',
          message: 'Viewability fired before impression',
          details: `${request.vendor.name}: Viewability beacon fired ${Math.round(sequence.impression.timestamp - request.timestamp)}ms before impression pixel. This may cause measurement discrepancies.`,
          relatedRequestIds: [request.id, sequence.impression.requestId],
        };
        issues.set(request.id, issue);
      } else if (!sequence.impression) {
        // No impression yet - mark viewability and check when impression comes in
        sequence.viewability = { requestId: request.id, timestamp: request.timestamp };
      }
    }
  }

  return issues;
}

/**
 * Run all issue detection on a single request
 */
export function detectRequestIssues(request: EnrichedRequest): Issue[] {
  const issues: Issue[] = [];

  const timeoutIssue = detectTimeout(request);
  if (timeoutIssue) issues.push(timeoutIssue);

  const slowIssue = detectSlowResponse(request);
  if (slowIssue) issues.push(slowIssue);

  const failedIssue = detectFailedRequest(request);
  if (failedIssue) issues.push(failedIssue);

  return issues;
}

/**
 * Run all cross-request issue detection
 */
export function detectCrossRequestIssues(
  requests: EnrichedRequest[]
): Map<string, Issue[]> {
  const issuesByRequest = new Map<string, Issue[]>();

  // Detect duplicates
  const duplicateIssues = detectDuplicatePixels(requests);
  for (const [requestId, issue] of duplicateIssues) {
    if (!issuesByRequest.has(requestId)) {
      issuesByRequest.set(requestId, []);
    }
    issuesByRequest.get(requestId)!.push(issue);
  }

  // Detect out-of-order beacons
  const orderingIssues = detectOutOfOrderBeacons(requests);
  for (const [requestId, issue] of orderingIssues) {
    if (!issuesByRequest.has(requestId)) {
      issuesByRequest.set(requestId, []);
    }
    issuesByRequest.get(requestId)!.push(issue);
  }

  return issuesByRequest;
}

/**
 * Get issue summary for a set of requests
 */
export function getIssueSummary(requests: EnrichedRequest[]): {
  total: number;
  byType: Record<IssueType, number>;
  bySeverity: { warning: number; error: number };
} {
  const summary = {
    total: 0,
    byType: {
      timeout: 0,
      failed: 0,
      duplicate_pixel: 0,
      out_of_order: 0,
      slow_response: 0,
    } as Record<IssueType, number>,
    bySeverity: { warning: 0, error: 0 },
  };

  for (const request of requests) {
    if (!request.issues) continue;

    for (const issue of request.issues) {
      summary.total++;
      summary.byType[issue.type]++;
      summary.bySeverity[issue.severity]++;
    }
  }

  return summary;
}
