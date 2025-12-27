import React from 'react';
import { useRequestStore } from '@/contexts/RequestStoreContext';
import type { IssueType, Issue, EnrichedRequest } from '@/lib/types';
import { ISSUE_LABELS, ISSUE_COLORS } from '@/lib/types';

const ISSUE_TYPES: IssueType[] = [
  'failed',
  'timeout',
  'slow_response',
  'duplicate_pixel',
  'out_of_order',
];

interface IssuePanelProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function IssuePanel({ collapsed = false, onToggle }: IssuePanelProps) {
  const { requests, getIssueCounts, toggleShowOnlyIssues, filters, selectRequest } =
    useRequestStore();

  const counts = getIssueCounts();

  // Get all requests with issues
  const requestsWithIssues = requests.filter(
    (r) => r.issues && r.issues.length > 0
  );

  if (counts.total === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-amber-600 dark:text-amber-400 transition-transform ${
              collapsed ? '' : 'rotate-90'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {counts.total} Issue{counts.total !== 1 ? 's' : ''} Detected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Issue type badges */}
          {ISSUE_TYPES.map((type) => {
            const count = counts.byType[type];
            if (count === 0) return null;

            return (
              <span
                key={type}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
              >
                {ISSUE_LABELS[type]}: {count}
              </span>
            );
          })}

          {/* Filter toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleShowOnlyIssues();
            }}
            className={`px-2 py-0.5 text-[10px] rounded border ${
              filters.showOnlyIssues
                ? 'bg-amber-500 border-amber-600 text-white'
                : 'bg-white dark:bg-gray-700 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800'
            }`}
          >
            {filters.showOnlyIssues ? 'Show All' : 'Show Only Issues'}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {!collapsed && (
        <div className="px-3 pb-2 max-h-48 overflow-auto">
          <div className="space-y-1">
            {requestsWithIssues.map((request) => (
              <IssueRow
                key={request.id}
                request={request}
                onSelect={() => selectRequest(request)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssueRow({
  request,
  onSelect,
}: {
  request: EnrichedRequest;
  onSelect: () => void;
}) {
  if (!request.issues || request.issues.length === 0) return null;

  return (
    <div
      className="flex items-start gap-2 p-1.5 rounded bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
      onClick={onSelect}
    >
      {/* Vendor */}
      <div className="w-28 flex-shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
        {request.vendor?.name || 'Unknown'}
      </div>

      {/* Issues */}
      <div className="flex-1 flex flex-wrap gap-1">
        {request.issues.map((issue, idx) => (
          <span
            key={idx}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: issue.severity === 'error' ? '#FEE2E2' : '#FEF3C7',
              color: issue.severity === 'error' ? '#991B1B' : '#92400E',
            }}
            title={issue.details}
          >
            {ISSUE_LABELS[issue.type]}: {issue.message}
          </span>
        ))}
      </div>

      {/* URL snippet */}
      <div className="w-40 flex-shrink-0 text-[10px] text-gray-500 dark:text-gray-400 truncate text-right">
        {getUrlPath(request.url)}
      </div>
    </div>
  );
}

function getUrlPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.length > 30
      ? urlObj.pathname.substring(0, 27) + '...'
      : urlObj.pathname;
  } catch {
    return url.substring(0, 30);
  }
}
