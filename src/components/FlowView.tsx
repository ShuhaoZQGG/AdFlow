import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRequestStore } from '@/contexts/RequestStoreContext';
import VendorBadge from './VendorBadge';
import type { EnrichedRequest, AdFlow, AdFlowStage } from '@/lib/types';
import { AD_FLOW_STAGE_META, ISSUE_LABELS } from '@/lib/types';
import { groupRequestsIntoFlows } from '@/lib/adflow';
import { generateHeaderBiddingAnalysis } from '@/lib/headerbidding';

interface FlowViewProps {
  requests: EnrichedRequest[];
}

export default function FlowView({ requests }: FlowViewProps) {
  const { selectRequest, selectedRequest } = useRequestStore();

  // Use debounced flow calculation to prevent blocking UI during rapid request updates
  const [flows, setFlows] = useState<AdFlow[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestIdsRef = useRef<string>('');

  useEffect(() => {
    // Create a stable key from request IDs to detect actual changes
    const requestIds = requests.map(r => r.id).join(',');
    
    // Only recalculate if request IDs actually changed
    if (requestIds === lastRequestIdsRef.current) {
      return;
    }
    
    lastRequestIdsRef.current = requestIds;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Calculate flows immediately for the first render or if requests are stable
    if (flows.length === 0) {
      setFlows(groupRequestsIntoFlows(requests));
      return;
    }

    // Debounce flow recalculation to prevent blocking during rapid updates
    // Use a short delay (50ms) to balance responsiveness and performance
    debounceTimerRef.current = setTimeout(() => {
      setFlows(groupRequestsIntoFlows(requests));
    }, 50);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [requests, flows.length]);

  // Calculate header bidding analysis based on debounced flows to avoid double calculation
  const headerBiddingAnalysis = useMemo(() => {
    if (requests.length === 0 || flows.length === 0) {
      return null;
    }
    try {
      return generateHeaderBiddingAnalysis(requests, flows);
    } catch (error) {
      console.error('Failed to generate header bidding analysis:', error);
      return null;
    }
  }, [requests, flows]);

  // Create conflict map for quick lookup
  const conflictMap = useMemo(() => {
    if (!headerBiddingAnalysis || !headerBiddingAnalysis.conflicts) return new Map<string, boolean>();
    const map = new Map<string, boolean>();
    headerBiddingAnalysis.conflicts.forEach(conflict => {
      map.set(conflict.flowId, true);
    });
    return map;
  }, [headerBiddingAnalysis]);

  if (flows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-sm">No ad flows detected</p>
        <p className="text-xs mt-1">Ad flows will appear as requests are captured</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-medium">{flows.length} Ad Flow{flows.length !== 1 ? 's' : ''}</span>
        <span className="text-gray-400 dark:text-gray-500">|</span>
        <span>{requests.length} total requests</span>
        {flows.filter(f => f.issues.length > 0).length > 0 && (
          <>
            <span className="text-gray-400 dark:text-gray-500">|</span>
            <span className="text-amber-600 dark:text-amber-400">
              {flows.filter(f => f.issues.length > 0).length} with issues
            </span>
          </>
        )}
      </div>

      {/* Flows */}
      {flows.map((flow) => (
        <FlowCard
          key={flow.id}
          flow={flow}
          selectedRequestId={selectedRequest?.id}
          onSelectRequest={selectRequest}
          hasConflict={conflictMap.get(flow.id) || false}
          headerBiddingAnalysis={headerBiddingAnalysis}
        />
      ))}
    </div>
  );
}

interface FlowCardProps {
  flow: AdFlow;
  selectedRequestId?: string;
  onSelectRequest: (request: EnrichedRequest | null) => void;
  hasConflict: boolean;
  headerBiddingAnalysis: ReturnType<ReturnType<typeof useRequestStore>['getHeaderBiddingAnalysis']>;
}

function FlowCard({ flow, selectedRequestId, onSelectRequest, hasConflict, headerBiddingAnalysis }: FlowCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Get stages in order
  const orderedStages = Array.from(flow.stages.entries())
    .sort((a, b) => AD_FLOW_STAGE_META[a[0]].order - AD_FLOW_STAGE_META[b[0]].order);

  const hasIssues = flow.issues.length > 0;
  const duration = flow.endTime ? flow.endTime - flow.startTime : undefined;

  // Check if this flow has header bidding
  const hasHeaderBidding = flow.stages.has('prebid_auction') || 
                          flow.stages.has('bid_request');

  // Calculate bid latency for this flow if it has header bidding
  const bidLatency = useMemo(() => {
    if (!hasHeaderBidding || !headerBiddingAnalysis) return null;
    
    const bidRequests = [
      ...(flow.stages.get('prebid_auction') || []),
      ...(flow.stages.get('bid_request') || []),
    ];
    
    if (bidRequests.length === 0) return null;

    const latencies = bidRequests
      .filter(r => r.duration !== undefined && r.duration > 0)
      .map(r => r.duration!);
    
    if (latencies.length === 0) return null;
    
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    return Math.round(avg);
  }, [flow, hasHeaderBidding, headerBiddingAnalysis]);

  const borderColor = hasConflict
    ? 'border-red-300 dark:border-red-700'
    : hasIssues
    ? 'border-amber-300 dark:border-amber-700'
    : 'border-gray-200 dark:border-gray-700';
  
  const bgColor = hasConflict
    ? 'bg-red-50 dark:bg-red-900/20'
    : hasIssues
    ? 'bg-amber-50 dark:bg-amber-900/20'
    : '';

  return (
    <div className={`rounded-lg border ${borderColor} bg-white dark:bg-[#1e1e1e] overflow-hidden`}>
      {/* Flow Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${bgColor}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          {/* Slot/Ad Unit info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {flow.slotId || flow.adUnitPath || 'Ad Flow'}
              </span>
              {hasHeaderBidding && (
                <span 
                  className="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                  title={bidLatency ? `Header Bidding - Avg latency: ${bidLatency}ms` : 'Header Bidding'}
                >
                  HB{bidLatency ? ` (${bidLatency}ms)` : ''}
                </span>
              )}
              {flow.winningBid && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  {flow.winningBid.vendor}
                  {flow.winningBid.price !== undefined && ` · $${flow.winningBid.price.toFixed(2)}`}
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">
              {flow.requests.length} requests
              {duration !== undefined && ` · ${formatDuration(duration)}`}
            </div>
          </div>
        </div>

        {/* Stage indicators */}
        <div className="flex items-center gap-1">
          {orderedStages.map(([stage, requests]) => (
            <StageIndicator key={stage} stage={stage} count={requests.length} />
          ))}

          {hasConflict && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" title="Header bidding conflict detected">
              Conflict
            </span>
          )}
          {hasIssues && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
              {flow.issues.length} issue{flow.issues.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Stage groups */}
          {orderedStages.map(([stage, requests]) => (
            <StageGroup
              key={stage}
              stage={stage}
              requests={requests}
              selectedRequestId={selectedRequestId}
              onSelectRequest={onSelectRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StageIndicator({ stage, count }: { stage: AdFlowStage; count: number }) {
  const meta = AD_FLOW_STAGE_META[stage];

  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
      style={{ backgroundColor: meta.color + '20', color: meta.color }}
      title={`${meta.label}: ${count} request${count !== 1 ? 's' : ''}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      <span>{count}</span>
    </div>
  );
}

interface StageGroupProps {
  stage: AdFlowStage;
  requests: EnrichedRequest[];
  selectedRequestId?: string;
  onSelectRequest: (request: EnrichedRequest | null) => void;
}

// Track expanded state per stage across re-renders using a module-level Map
const expandedStages = new Map<string, boolean>();

function StageGroup({ stage, requests, selectedRequestId, onSelectRequest }: StageGroupProps) {
  const meta = AD_FLOW_STAGE_META[stage];

  // Use stored preference if user has explicitly toggled, otherwise default based on count
  const getInitialCollapsed = () => {
    if (expandedStages.has(stage)) {
      return !expandedStages.get(stage);
    }
    return requests.length > 5;
  };

  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  // Handle explicit user toggle
  const handleExpand = () => {
    expandedStages.set(stage, true);
    setCollapsed(false);
  };

  const handleCollapse = () => {
    expandedStages.set(stage, false);
    setCollapsed(true);
  };

  const displayedRequests = collapsed ? requests.slice(0, 3) : requests;
  const hiddenCount = requests.length - displayedRequests.length;

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Stage header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        <span className="text-[11px] font-medium" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className="text-[10px] text-gray-400">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Requests */}
      <div>
        {displayedRequests.map((request) => (
          <RequestRow
            key={request.id}
            request={request}
            isSelected={selectedRequestId === request.id}
            onSelectRequest={onSelectRequest}
            selectedRequestId={selectedRequestId}
          />
        ))}

        {hiddenCount > 0 && (
          <button
            onClick={handleExpand}
            className="w-full py-1.5 text-[10px] text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            Show {hiddenCount} more request{hiddenCount !== 1 ? 's' : ''}
          </button>
        )}

        {!collapsed && requests.length > 5 && (
          <button
            onClick={handleCollapse}
            className="w-full py-1.5 text-[10px] text-gray-500 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}

interface RequestRowProps {
  request: EnrichedRequest;
  isSelected: boolean;
  onSelectRequest: (request: EnrichedRequest | null) => void;
  selectedRequestId?: string;
}

const RequestRow = React.memo(function RequestRow({ request, isSelected, onSelectRequest, selectedRequestId }: RequestRowProps) {
  // Use useCallback to create a stable click handler
  const handleClick = useCallback(() => {
    onSelectRequest(selectedRequestId === request.id ? null : request);
  }, [request, selectedRequestId, onSelectRequest]);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
      }`}
      onClick={handleClick}
    >
      {/* Status indicator */}
      <StatusDot request={request} />

      {/* Timing */}
      <span className="w-14 flex-shrink-0 text-[10px] text-gray-500 dark:text-gray-400 tabular-nums">
        +{formatDuration(request.startTime)}
      </span>

      {/* Vendor */}
      <div className="w-28 flex-shrink-0">
        <VendorBadge vendor={request.vendor} size="sm" />
      </div>

      {/* URL */}
      <span className="flex-1 text-[11px] text-gray-600 dark:text-gray-400 truncate">
        {getUrlPath(request.url)}
      </span>

      {/* Duration */}
      <span className="w-14 flex-shrink-0 text-right text-[10px] text-gray-500 dark:text-gray-400 tabular-nums">
        {request.duration ? `${Math.round(request.duration)}ms` : '...'}
      </span>

      {/* Issues */}
      {request.issues && request.issues.length > 0 && (
        <span
          className="px-1 py-0.5 text-[9px] rounded"
          style={{
            backgroundColor: request.issues.some(i => i.severity === 'error') ? '#FEE2E2' : '#FEF3C7',
            color: request.issues.some(i => i.severity === 'error') ? '#991B1B' : '#92400E',
          }}
        >
          {request.issues.length}
        </span>
      )}
    </div>
  );
});

function StatusDot({ request }: { request: EnrichedRequest }) {
  if (request.error) {
    return <span className="w-2 h-2 rounded-full bg-red-500" title={request.error} />;
  }

  if (!request.completed) {
    return <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />;
  }

  const status = request.statusCode || 0;
  let color = 'bg-gray-400';

  if (status >= 200 && status < 300) color = 'bg-green-500';
  else if (status >= 300 && status < 400) color = 'bg-blue-500';
  else if (status >= 400) color = 'bg-red-500';

  return <span className={`w-2 h-2 rounded-full ${color}`} title={`${status}`} />;
}

function getUrlPath(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    return path.length > 60 ? path.substring(0, 57) + '...' : path;
  } catch {
    return url.substring(0, 60);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}
