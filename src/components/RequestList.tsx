import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRequestStore } from '@/contexts/RequestStoreContext';
import VendorBadge from './VendorBadge';
import type { EnrichedRequest, Issue, IssueType } from '@/lib/types';
import { ISSUE_COLORS, ISSUE_LABELS } from '@/lib/types';

interface RequestListProps {
  requests: EnrichedRequest[];
}

export default function RequestList({ requests }: RequestListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { selectedRequest, selectRequest } = useRequestStore();

  const virtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const handleRowClick = useCallback((request: EnrichedRequest) => {
    selectRequest(selectedRequest?.id === request.id ? null : request);
  }, [selectedRequest, selectRequest]);

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const request = requests[virtualRow.index];
          const isSelected = selectedRequest?.id === request.id;

          return (
            <div
              key={request.id}
              data-index={virtualRow.index}
              className={`request-row absolute left-0 right-0 flex items-center px-3 py-1.5 cursor-pointer border-b border-gray-100 dark:border-gray-800 ${
                isSelected ? 'selected' : ''
              }`}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={() => handleRowClick(request)}
            >
              {/* Status indicator */}
              <div className="w-6 flex-shrink-0">
                <StatusIndicator request={request} />
              </div>

              {/* Timing */}
              <div className="w-16 flex-shrink-0 text-[10px] text-gray-500 dark:text-gray-400 tabular-nums">
                +{formatTime(request.startTime)}
              </div>

              {/* Vendor badge */}
              <div className="w-32 flex-shrink-0">
                <VendorBadge vendor={request.vendor} />
              </div>

              {/* Request type */}
              <div className="w-20 flex-shrink-0 text-[10px] text-gray-500 dark:text-gray-400">
                {request.vendorRequestType !== 'unknown' && (
                  <span className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                    {request.vendorRequestType}
                  </span>
                )}
              </div>

              {/* URL */}
              <div className="flex-1 min-w-0 text-xs truncate">
                <span className="text-gray-600 dark:text-gray-400">
                  {getUrlPath(request.url)}
                </span>
              </div>

              {/* Issues */}
              <div className="w-24 flex-shrink-0 flex items-center gap-1 justify-end">
                <IssueIndicators issues={request.issues} />
              </div>

              {/* Duration */}
              <div className="w-16 flex-shrink-0 text-right text-[10px] text-gray-500 dark:text-gray-400 tabular-nums">
                {request.duration ? `${Math.round(request.duration)}ms` : '...'}
              </div>

              {/* Size */}
              <div className="w-14 flex-shrink-0 text-right text-[10px] text-gray-500 dark:text-gray-400 tabular-nums">
                {request.responseSize ? formatBytes(request.responseSize) : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusIndicator({ request }: { request: EnrichedRequest }) {
  if (request.error) {
    return (
      <span className="inline-block w-2 h-2 rounded-full bg-red-500" title={request.error} />
    );
  }

  if (!request.completed) {
    return (
      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
    );
  }

  const status = request.statusCode || 0;
  let color = 'bg-gray-400';

  if (status >= 200 && status < 300) {
    color = 'bg-green-500';
  } else if (status >= 300 && status < 400) {
    color = 'bg-blue-500';
  } else if (status >= 400) {
    color = 'bg-red-500';
  }

  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={`${status}`} />
  );
}

function getUrlPath(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    return path.length > 100 ? path.substring(0, 100) + '...' : path;
  } catch {
    return url.substring(0, 100);
  }
}

function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function IssueIndicators({ issues }: { issues?: Issue[] }) {
  if (!issues || issues.length === 0) {
    return null;
  }

  // Group issues by type and show unique badges
  const issuesByType = new Map<IssueType, Issue>();
  for (const issue of issues) {
    if (!issuesByType.has(issue.type)) {
      issuesByType.set(issue.type, issue);
    }
  }

  return (
    <>
      {Array.from(issuesByType.entries()).map(([type, issue]) => (
        <span
          key={type}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium"
          style={{
            backgroundColor: issue.severity === 'error' ? '#FEE2E2' : '#FEF3C7',
            color: issue.severity === 'error' ? '#991B1B' : '#92400E',
          }}
          title={issue.message + (issue.details ? `: ${issue.details}` : '')}
        >
          {ISSUE_LABELS[type]}
        </span>
      ))}
    </>
  );
}
