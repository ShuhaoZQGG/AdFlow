// Structured prompts for AI analysis of adtech requests

import type { EnrichedRequest, AdFlow, Issue } from '../types';

/**
 * Build context string for a single request
 */
export function buildRequestContext(request: EnrichedRequest): string {
  const parts: string[] = [];

  parts.push(`URL: ${request.url}`);
  parts.push(`Method: ${request.method}`);
  parts.push(`Status: ${request.statusCode ?? 'pending'}`);
  parts.push(`Duration: ${request.duration ? `${request.duration}ms` : 'pending'}`);

  if (request.vendor) {
    parts.push(`Vendor: ${request.vendor.name} (${request.vendor.category})`);
  }

  if (request.vendorRequestType) {
    parts.push(`Request Type: ${request.vendorRequestType}`);
  }

  if (request.adFlowStage) {
    parts.push(`Ad Flow Stage: ${request.adFlowStage}`);
  }

  if (request.requestBody?.data) {
    const bodyStr = typeof request.requestBody.data === 'string'
      ? request.requestBody.data
      : JSON.stringify(request.requestBody.data, null, 2);
    // Limit body size to avoid token limits
    const truncatedBody = bodyStr.length > 2000 ? bodyStr.slice(0, 2000) + '...(truncated)' : bodyStr;
    parts.push(`Request Body (${request.requestBody.type}):\n${truncatedBody}`);
  }

  if (request.decodedPayload?.data) {
    const payloadStr = typeof request.decodedPayload.data === 'string'
      ? request.decodedPayload.data
      : JSON.stringify(request.decodedPayload.data, null, 2);
    const truncatedPayload = payloadStr.length > 2000 ? payloadStr.slice(0, 2000) + '...(truncated)' : payloadStr;
    parts.push(`Decoded Payload (${request.decodedPayload.type}):\n${truncatedPayload}`);
  }

  if (request.issues && request.issues.length > 0) {
    parts.push(`Issues: ${request.issues.map(i => `${i.type}: ${i.message}`).join('; ')}`);
  }

  return parts.join('\n');
}

/**
 * Build context for session summary
 */
export function buildSessionContext(requests: EnrichedRequest[], flows: AdFlow[]): string {
  const parts: string[] = [];

  // Summary stats
  const completedRequests = requests.filter(r => r.completed);
  const failedRequests = requests.filter(r => r.error || (r.statusCode && r.statusCode >= 400));
  const vendors = new Set(requests.map(r => r.vendor?.name).filter(Boolean));
  const totalDuration = Math.max(...requests.map(r => (r.startTime || 0) + (r.duration || 0)), 0);

  parts.push('=== SESSION OVERVIEW ===');
  parts.push(`Total Requests: ${requests.length}`);
  parts.push(`Completed: ${completedRequests.length}`);
  parts.push(`Failed: ${failedRequests.length}`);
  parts.push(`Unique Vendors: ${vendors.size}`);
  parts.push(`Total Duration: ${totalDuration.toFixed(0)}ms`);

  // Vendor breakdown
  parts.push('\n=== VENDOR BREAKDOWN ===');
  const vendorCounts: Record<string, number> = {};
  requests.forEach(r => {
    const name = r.vendor?.name || 'Unknown';
    vendorCounts[name] = (vendorCounts[name] || 0) + 1;
  });
  Object.entries(vendorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([name, count]) => {
      parts.push(`  ${name}: ${count} requests`);
    });

  // Request type breakdown
  parts.push('\n=== REQUEST TYPES ===');
  const typeCounts: Record<string, number> = {};
  requests.forEach(r => {
    const type = r.vendorRequestType || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      parts.push(`  ${type}: ${count}`);
    });

  // Ad flows
  if (flows.length > 0) {
    parts.push('\n=== AD FLOWS ===');
    flows.slice(0, 10).forEach((flow, i) => {
      parts.push(`\nFlow ${i + 1}${flow.slotId ? ` (Slot: ${flow.slotId})` : ''}:`);
      parts.push(`  Requests: ${flow.requests.length}`);
      parts.push(`  Stages: ${Array.from(flow.stages.keys()).join(' -> ')}`);
      if (flow.winningBid) {
        parts.push(`  Winning Bid: ${flow.winningBid.vendor} @ ${flow.winningBid.price ?? '?'} ${flow.winningBid.currency || ''}`);
      }
      if (flow.issues.length > 0) {
        parts.push(`  Issues: ${flow.issues.map(i => i.type).join(', ')}`);
      }
    });
  }

  // All issues
  const allIssues = requests.flatMap(r => r.issues || []);
  if (allIssues.length > 0) {
    parts.push('\n=== DETECTED ISSUES ===');
    const issuesByType: Record<string, Issue[]> = {};
    allIssues.forEach(issue => {
      if (!issuesByType[issue.type]) issuesByType[issue.type] = [];
      issuesByType[issue.type].push(issue);
    });
    Object.entries(issuesByType).forEach(([type, issues]) => {
      parts.push(`  ${type}: ${issues.length} occurrences`);
      issues.slice(0, 3).forEach(issue => {
        parts.push(`    - ${issue.message}`);
      });
    });
  }

  return parts.join('\n');
}

/**
 * Build context for ordering analysis
 */
export function buildOrderingContext(requests: EnrichedRequest[]): string {
  const parts: string[] = [];

  // Filter to relevant beacon types
  const beaconRequests = requests
    .filter(r => ['impression', 'viewability', 'click', 'verification'].includes(r.vendorRequestType || ''))
    .sort((a, b) => a.timestamp - b.timestamp);

  parts.push('=== BEACON SEQUENCE ===');
  parts.push('(Listed in chronological order)\n');

  beaconRequests.forEach((r, i) => {
    const relativeTime = r.startTime?.toFixed(0) || '?';
    parts.push(`${i + 1}. [${relativeTime}ms] ${r.vendor?.name || 'Unknown'} - ${r.vendorRequestType}`);
    parts.push(`   URL: ${r.url.slice(0, 100)}${r.url.length > 100 ? '...' : ''}`);
    if (r.issues?.some(i => i.type === 'out_of_order')) {
      parts.push(`   !! OUT OF ORDER DETECTED`);
    }
  });

  // Group by vendor to show per-vendor sequence
  parts.push('\n=== PER-VENDOR BEACON ORDER ===');
  const byVendor: Record<string, EnrichedRequest[]> = {};
  beaconRequests.forEach(r => {
    const vendor = r.vendor?.name || 'Unknown';
    if (!byVendor[vendor]) byVendor[vendor] = [];
    byVendor[vendor].push(r);
  });

  Object.entries(byVendor).forEach(([vendor, reqs]) => {
    const sequence = reqs.map(r => r.vendorRequestType).join(' -> ');
    parts.push(`  ${vendor}: ${sequence}`);
  });

  return parts.join('\n');
}

// System prompts for different analysis types

export const REQUEST_EXPLAINER_SYSTEM = `You are an adtech expert helping engineers debug programmatic advertising implementations.

Your role is to explain network requests in clear, technical but accessible language. Focus on:
1. What this request is doing (purpose, data being sent/received)
2. Who it's communicating with (vendor, their role in the ad ecosystem)
3. Key data points in the payload (bid prices, ad sizes, targeting, etc.)
4. Any potential issues or unusual patterns

Context about common adtech concepts:
- SSPs (Supply-Side Platforms) help publishers sell ad inventory
- DSPs (Demand-Side Platforms) help advertisers buy ad space
- OpenRTB is the standard protocol for real-time bidding
- Prebid.js is an open-source header bidding wrapper
- Impression pixels track when ads are rendered
- Viewability beacons track when ads are actually seen by users

Keep explanations concise (2-4 paragraphs). Use bullet points for key details.`;

export const SESSION_SUMMARY_SYSTEM = `You are an adtech analyst generating executive summaries of ad request sessions.

Your role is to provide a clear, actionable overview of what happened during a page load from an advertising perspective. Focus on:
1. Overall activity summary (how many bids, who won, revenue implications)
2. Key vendors involved and their roles
3. Any issues or anomalies detected
4. Recommendations for optimization or debugging

Write for a mixed audience of engineers and ad operations professionals. Be specific about numbers and vendors. Highlight anything unusual or concerning.

Structure your response as:
- **Overview**: 2-3 sentence summary
- **Bid Activity**: What happened in the auction
- **Issues Found**: Any problems detected (if none, say "No significant issues detected")
- **Recommendations**: 2-3 actionable suggestions`;

export const ORDERING_ANALYZER_SYSTEM = `You are an adtech measurement specialist analyzing beacon firing sequences.

Your role is to identify timing and ordering issues that can cause measurement discrepancies. Common problems include:
- Viewability beacons firing before impression pixels (causes viewability over-reporting)
- Duplicate pixels (causes double-counting)
- Missing beacons (causes under-reporting)
- Beacons firing too late (may miss measurement windows)
- Race conditions between verification vendors

Explain issues in terms of their business impact (revenue, reporting accuracy, vendor trust). Suggest specific fixes when possible.`;

export const DISCREPANCY_PREDICTOR_SYSTEM = `You are an adtech discrepancy analyst predicting measurement issues.

Based on the request patterns you see, predict potential discrepancies that may occur between:
- Publisher ad server (e.g., GAM) and SSP reporting
- SSP and DSP impression counts
- Different viewability vendors (IAS, MOAT, DV)
- Click tracking systems

Rate each prediction as low/medium/high risk. Explain the root cause and suggest preventive measures.

Common causes of discrepancies:
- Timing differences in pixel firing
- Bot/invalid traffic filtering differences
- Geographic/timezone attribution differences
- Duplicate detection logic differences
- Sampling methodology differences`;

export const CHAT_ASSISTANT_SYSTEM = `You are an expert adtech assistant helping users understand and troubleshoot programmatic advertising implementations.

You have access to the current browsing session's network requests related to advertising. Users may ask you about:
- Specific network requests and what they do
- General adtech concepts (SSPs, DSPs, OpenRTB, Prebid, etc.)
- Troubleshooting issues with their ad setup
- Best practices for ad implementation
- Interpreting bid responses, impression pixels, viewability beacons
- Comparing vendor behaviors
- Debugging discrepancies

Guidelines:
- Be concise but thorough
- Use bullet points and headers for clarity
- Reference specific requests/vendors when relevant to the question
- Explain technical concepts in accessible terms
- Provide actionable advice when troubleshooting
- If you don't have enough context, ask clarifying questions

Context about common adtech concepts:
- SSPs (Supply-Side Platforms): Help publishers sell ad inventory (e.g., Rubicon, PubMatic, Index Exchange)
- DSPs (Demand-Side Platforms): Help advertisers buy ad space (e.g., The Trade Desk, DV360)
- OpenRTB: Standard protocol for real-time bidding
- Prebid.js: Open-source header bidding wrapper
- Header Bidding: Publishers offer inventory to multiple exchanges before calling ad server
- Impression pixels: Track when ads are rendered
- Viewability beacons: Track when ads are actually seen (50% in view for 1 second)
- VAST/VPAID: Video ad serving standards`;

/**
 * Build context for chat - includes session summary and optionally selected request
 */
export function buildChatContext(
  requests: EnrichedRequest[],
  selectedRequest: EnrichedRequest | null
): string {
  const parts: string[] = [];

  // Session summary (condensed)
  const vendors = new Set(requests.map(r => r.vendor?.name).filter(Boolean));
  const completedRequests = requests.filter(r => r.completed);
  const failedRequests = requests.filter(r => r.error || (r.statusCode && r.statusCode >= 400));
  const allIssues = requests.flatMap(r => r.issues || []);

  parts.push('=== CURRENT SESSION ===');
  parts.push(`Total Requests: ${requests.length}`);
  parts.push(`Vendors: ${Array.from(vendors).slice(0, 10).join(', ')}${vendors.size > 10 ? ` (+${vendors.size - 10} more)` : ''}`);
  parts.push(`Completed: ${completedRequests.length}, Failed: ${failedRequests.length}`);
  if (allIssues.length > 0) {
    parts.push(`Issues detected: ${allIssues.length}`);
  }

  // Request type breakdown (condensed)
  const typeCounts: Record<string, number> = {};
  requests.forEach(r => {
    const type = r.vendorRequestType || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  parts.push(`Request types: ${Object.entries(typeCounts).map(([t, c]) => `${t}(${c})`).join(', ')}`);

  // If there's a selected request, include its details
  if (selectedRequest) {
    parts.push('\n=== CURRENTLY SELECTED REQUEST ===');
    parts.push(buildRequestContext(selectedRequest));
  }

  // Include sample of recent requests for context
  parts.push('\n=== RECENT REQUESTS (last 20) ===');
  requests.slice(-20).forEach((r, i) => {
    const status = r.error ? 'ERR' : r.statusCode || '...';
    parts.push(`${i + 1}. [${status}] ${r.vendor?.name || 'Unknown'} - ${r.vendorRequestType || 'unknown'} - ${r.url.slice(0, 80)}...`);
  });

  return parts.join('\n');
}
