import React, { useState, useRef, useCallback, useEffect } from 'react';
import Markdown from 'react-markdown';
import type { EnrichedRequest, DecodedPayload, Issue, AIExplanation } from '@/lib/types';
import VendorBadge from './VendorBadge';
import { CATEGORY_COLORS, ISSUE_LABELS, ISSUE_COLORS } from '@/lib/types';
import { useRequestStore } from '@/contexts/RequestStoreContext';

// Copy to clipboard with fallback for DevTools context
function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => resolve(true))
        .catch(() => {
          // Fallback to execCommand
          resolve(fallbackCopy(text));
        });
    } else {
      // Use fallback directly
      resolve(fallbackCopy(text));
    }
  });
}

// Fallback copy method using textarea and execCommand
function fallbackCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }

  document.body.removeChild(textarea);
  return success;
}

// Copy button component with tooltip
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleCopy}
        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title={label ? `Copy ${label}` : 'Copy to clipboard'}
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      {/* Success tooltip */}
      {copied && (
        <div className="absolute right-full mr-2 px-2 py-1 text-xs font-medium text-white bg-green-500 rounded shadow-lg whitespace-nowrap animate-fade-in">
          Copied!
        </div>
      )}
    </div>
  );
}

// Helper to format data for copying
function formatForCopy(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data, null, 2);
}

// Helper to format headers for copying
function formatHeadersForCopy(headers: chrome.webRequest.HttpHeader[]): string {
  return headers.map(h => `${h.name}: ${h.value}`).join('\n');
}

// Markdown component styles for AI explanations
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-3 mb-2">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1.5">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-2 mb-1">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-2 ml-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-2 ml-2">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-sm">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">{children}</code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>
  ),
};

interface RequestDetailProps {
  request: EnrichedRequest;
}

type TabType = 'payload' | 'headers' | 'timing' | 'issues' | 'ai';

// Default header height as percentage (50% = centered divider)
const DEFAULT_HEADER_HEIGHT_PERCENT = 30;
const MIN_HEADER_HEIGHT = 60;
const MIN_CONTENT_HEIGHT = 100;

export default function RequestDetail({ request }: RequestDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('payload');
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightStatus, setHighlightStatus] = useState<'idle' | 'finding' | 'found' | 'not-found'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Initialize header height on mount
  useEffect(() => {
    if (containerRef.current && headerHeight === null) {
      const containerHeight = containerRef.current.clientHeight;
      setHeaderHeight(Math.round(containerHeight * DEFAULT_HEADER_HEIGHT_PERCENT / 100));
    }
  }, [headerHeight]);

  // Check if we can highlight this request (has elementId or slotId)
  const canHighlight = !!(request.elementId || request.slotId);

  // Get current tab ID - works in both DevTools and side panel contexts
  const getCurrentTabId = useCallback(async (): Promise<number | null> => {
    // Try DevTools context first
    if (chrome.devtools?.inspectedWindow?.tabId) {
      return chrome.devtools.inspectedWindow.tabId;
    }
    // Fall back to querying active tab (for side panel)
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab?.id ?? null;
    } catch (e) {
      console.warn('[AdFlow] Failed to get current tab:', e);
      return null;
    }
  }, []);

  // Handle highlight element in page
  const handleHighlight = useCallback(async () => {
    if (!canHighlight) return;

    setHighlightStatus('finding');
    try {
      const tabId = await getCurrentTabId();
      if (!tabId) {
        setHighlightStatus('not-found');
        setTimeout(() => setHighlightStatus('idle'), 3000);
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: 'HIGHLIGHT_ELEMENT',
        tabId,
        payload: { elementId: request.elementId, slotId: request.slotId },
      });

      if (response?.success) {
        setHighlightStatus('found');
        setTimeout(() => setHighlightStatus('idle'), 3000);
      } else {
        setHighlightStatus('not-found');
        setTimeout(() => setHighlightStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Failed to highlight element:', err);
      setHighlightStatus('not-found');
      setTimeout(() => setHighlightStatus('idle'), 3000);
    }
  }, [request.elementId, request.slotId, canHighlight, getCurrentTabId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newHeight = e.clientY - containerRect.top;
    const maxHeight = containerRect.height - MIN_CONTENT_HEIGHT;

    setHeaderHeight(Math.max(MIN_HEADER_HEIGHT, Math.min(newHeight, maxHeight)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Header - resizable */}
      <div
        ref={headerRef}
        className="flex-shrink-0 overflow-auto bg-gray-50 dark:bg-[#252526]"
        style={{ height: headerHeight ?? 'auto' }}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <VendorBadge vendor={request.vendor} size="md" />
              {request.vendorRequestType !== 'unknown' && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {request.vendorRequestType}
                </span>
              )}
              <StatusBadge request={request} />
            </div>
            {/* Highlight in page button */}
            <button
              onClick={handleHighlight}
              disabled={!canHighlight || highlightStatus === 'finding'}
              className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                !canHighlight
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : highlightStatus === 'found'
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : highlightStatus === 'not-found'
                  ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                  : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900'
              }`}
              title={canHighlight ? 'Find and highlight this ad slot in the page' : 'No ad slot detected for this request'}
            >
              {!canHighlight ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  No slot
                </>
              ) : highlightStatus === 'finding' ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Finding...
                </>
              ) : highlightStatus === 'found' ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Found!
                </>
              ) : highlightStatus === 'not-found' ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Not found
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Highlight
                </>
              )}
            </button>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400 break-all">
            <span className="font-medium text-gray-900 dark:text-gray-100">{request.method}</span>{' '}
            {request.url}
          </div>

          {request.vendor?.category && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[request.vendor.category] }}
              />
              <span>{request.vendor.category}</span>
              {request.vendor.documentation && (
                <a
                  href={request.vendor.documentation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Docs
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Resizable divider */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex-shrink-0 h-1.5 cursor-row-resize flex items-center justify-center border-y border-gray-200 dark:border-gray-700 transition-colors ${
          isDragging
            ? 'bg-blue-500'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-blue-400 dark:hover:bg-blue-600'
        }`}
      >
        <div className="w-8 h-0.5 rounded-full bg-gray-400 dark:bg-gray-500" />
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-700">
        {(['payload', 'headers', 'timing', 'issues', 'ai'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium capitalize flex items-center gap-1 ${
              activeTab === tab
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab === 'ai' ? 'AI Explain' : tab}
            {tab === 'issues' && request.issues && request.issues.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-white">
                {request.issues.length}
              </span>
            )}
            {tab === 'ai' && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-3 min-h-0">
        {activeTab === 'payload' && <PayloadView request={request} />}
        {activeTab === 'headers' && <HeadersView request={request} />}
        {activeTab === 'timing' && <TimingView request={request} />}
        {activeTab === 'issues' && <IssuesView request={request} />}
        {activeTab === 'ai' && <AIExplainView request={request} />}
      </div>
    </div>
  );
}

function StatusBadge({ request }: { request: EnrichedRequest }) {
  if (request.error) {
    return (
      <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
        Error: {request.error}
      </span>
    );
  }

  if (!request.completed) {
    return (
      <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
        Pending...
      </span>
    );
  }

  const status = request.statusCode || 0;
  let colorClass = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';

  if (status >= 200 && status < 300) {
    colorClass = 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
  } else if (status >= 300 && status < 400) {
    colorClass = 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
  } else if (status >= 400) {
    colorClass = 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
  }

  return <span className={`px-1.5 py-0.5 text-xs rounded ${colorClass}`}>{status}</span>;
}

function PayloadView({ request }: { request: EnrichedRequest }) {
  const urlParams = request.decodedPayload;
  const requestBody = request.requestBody;
  const responsePayload = request.responsePayload;

  const hasUrlParams = !!urlParams;
  const hasRequestBody = !!requestBody;
  const hasResponsePayload = !!responsePayload;

  if (!hasUrlParams && !hasRequestBody && !hasResponsePayload) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
        No payload data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasUrlParams && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
              URL Parameters ({urlParams.type})
            </span>
            <CopyButton text={formatForCopy(urlParams.data)} label="URL parameters" />
          </div>
          <JsonView data={urlParams.data} />
        </div>
      )}

      {hasRequestBody && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
              Request Body ({requestBody.type})
            </span>
            <CopyButton text={formatForCopy(requestBody.data)} label="request body" />
          </div>
          <JsonView data={requestBody.data} />
        </div>
      )}

      {hasResponsePayload && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
              Response Payload ({responsePayload.type})
            </span>
            <CopyButton text={formatForCopy(responsePayload.data)} label="response payload" />
          </div>
          <JsonView data={responsePayload.data} />
        </div>
      )}
    </div>
  );
}

function HeadersView({ request }: { request: EnrichedRequest }) {
  return (
    <div className="space-y-4">
      {request.requestHeaders && request.requestHeaders.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
              Request Headers
            </span>
            <CopyButton text={formatHeadersForCopy(request.requestHeaders)} label="request headers" />
          </div>
          <HeadersTable headers={request.requestHeaders} />
        </div>
      )}

      {request.responseHeaders && request.responseHeaders.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
              Response Headers
            </span>
            <CopyButton text={formatHeadersForCopy(request.responseHeaders)} label="response headers" />
          </div>
          <HeadersTable headers={request.responseHeaders} />
        </div>
      )}

      {!request.requestHeaders?.length && !request.responseHeaders?.length && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
          No headers captured
        </div>
      )}
    </div>
  );
}

function HeadersTable({ headers }: { headers: chrome.webRequest.HttpHeader[] }) {
  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          {headers.map((header, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <td className="px-2 py-1 font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 w-1/3 align-top">
                {header.name}
              </td>
              <td className="px-2 py-1 text-gray-600 dark:text-gray-400 break-all">
                {header.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimingView({ request }: { request: EnrichedRequest }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 rounded bg-gray-50 dark:bg-gray-800">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
            Start Time
          </div>
          <div className="font-medium">+{formatMs(request.startTime)}</div>
        </div>

        <div className="p-2 rounded bg-gray-50 dark:bg-gray-800">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
            Duration
          </div>
          <div className="font-medium">
            {request.duration ? formatMs(request.duration) : 'Pending...'}
          </div>
        </div>

        <div className="p-2 rounded bg-gray-50 dark:bg-gray-800">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
            Status
          </div>
          <div className="font-medium">
            {request.error
              ? `Error: ${request.error}`
              : request.statusCode
              ? request.statusCode
              : 'Pending...'}
          </div>
        </div>

        <div className="p-2 rounded bg-gray-50 dark:bg-gray-800">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
            Type
          </div>
          <div className="font-medium capitalize">{request.type}</div>
        </div>
      </div>

      {/* Visual timeline bar */}
      {request.duration && (
        <div className="mt-4">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-2">
            Timeline
          </div>
          <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden relative">
            <div
              className="absolute top-1 bottom-1 rounded"
              style={{
                left: `${(request.startTime / (request.startTime + request.duration)) * 100}%`,
                width: `${(request.duration / (request.startTime + request.duration)) * 100}%`,
                backgroundColor: request.vendor
                  ? CATEGORY_COLORS[request.vendor.category]
                  : '#9CA3AF',
                minWidth: '4px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function JsonView({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState(true);

  if (typeof data === 'string') {
    return (
      <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-auto whitespace-pre-wrap break-all">
        {data}
      </pre>
    );
  }

  return (
    <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-auto">
      <code>
        <JsonNode data={data} depth={0} />
      </code>
    </pre>
  );
}

function JsonNode({ data, depth }: { data: unknown; depth: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const indent = '  '.repeat(depth);

  if (data === null) {
    return <span className="json-null">null</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="json-boolean">{data.toString()}</span>;
  }

  if (typeof data === 'number') {
    return <span className="json-number">{data}</span>;
  }

  if (typeof data === 'string') {
    return <span className="json-string">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span>[]</span>;

    if (collapsed) {
      return (
        <span
          onClick={() => setCollapsed(false)}
          className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-0.5"
        >
          [{data.length} items]
        </span>
      );
    }

    return (
      <span>
        <span
          onClick={() => setCollapsed(true)}
          className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-0.5"
        >
          [
        </span>
        {'\n'}
        {data.map((item, i) => (
          <span key={i}>
            {indent}  <JsonNode data={item} depth={depth + 1} />
            {i < data.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {indent}]
      </span>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span>{'{}'}</span>;

    if (collapsed) {
      return (
        <span
          onClick={() => setCollapsed(false)}
          className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-0.5"
        >
          {'{...}'}
        </span>
      );
    }

    return (
      <span>
        <span
          onClick={() => setCollapsed(true)}
          className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-0.5"
        >
          {'{'}
        </span>
        {'\n'}
        {entries.map(([key, value], i) => (
          <span key={key}>
            {indent}  <span className="json-key">"{key}"</span>:{' '}
            <JsonNode data={value} depth={depth + 1} />
            {i < entries.length - 1 ? ',' : ''}
            {'\n'}
          </span>
        ))}
        {indent}{'}'}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

function IssuesView({ request }: { request: EnrichedRequest }) {
  if (!request.issues || request.issues.length === 0) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
        <div className="mb-2">
          <svg className="w-8 h-8 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        No issues detected for this request
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {request.issues.map((issue, idx) => (
        <div
          key={idx}
          className="p-3 rounded border"
          style={{
            backgroundColor: issue.severity === 'error' ? '#FEF2F2' : '#FFFBEB',
            borderColor: issue.severity === 'error' ? '#FECACA' : '#FDE68A',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: issue.severity === 'error' ? '#FEE2E2' : '#FEF3C7',
                color: issue.severity === 'error' ? '#991B1B' : '#92400E',
              }}
            >
              {ISSUE_LABELS[issue.type]}
            </span>
            <span
              className="text-[10px] uppercase font-medium"
              style={{
                color: issue.severity === 'error' ? '#DC2626' : '#D97706',
              }}
            >
              {issue.severity}
            </span>
          </div>

          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {issue.message}
          </div>

          {issue.details && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {issue.details}
            </div>
          )}

          {issue.relatedRequestIds && issue.relatedRequestIds.length > 0 && (
            <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
              Related requests: {issue.relatedRequestIds.length}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function AIExplainView({ request }: { request: EnrichedRequest }) {
  const { aiExplanations, explainRequest, isAnalyzing, aiError, streamingText } = useRequestStore();
  const explanation = aiExplanations[request.id];
  const isStreaming = isAnalyzing && streamingText.length > 0;

  const handleExplain = () => {
    explainRequest(request);
  };

  return (
    <div className="space-y-3">
      {/* Explain button */}
      {!explanation && !isAnalyzing && (
        <div className="text-center py-6">
          <div className="mb-3">
            <svg className="w-10 h-10 mx-auto text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Get an AI-powered explanation of this request
          </p>
          <button
            onClick={handleExplain}
            className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Explain This Request
          </button>
        </div>
      )}

      {/* Loading state (no streaming yet) */}
      {isAnalyzing && !explanation && !isStreaming && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing request...</span>
          </div>
        </div>
      )}

      {/* Streaming state */}
      {isStreaming && !explanation && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Generating explanation...</span>
          </div>
          <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Markdown components={markdownComponents}>{streamingText}</Markdown>
            <span className="inline-block w-1.5 h-4 bg-blue-500 animate-pulse" />
          </div>
        </div>
      )}

      {/* Error state */}
      {aiError && !explanation && (
        <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300 mb-2">{aiError}</p>
          <button
            onClick={handleExplain}
            className="text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Explanation display */}
      {explanation && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>AI Explanation</span>
            </div>
            <button
              onClick={handleExplain}
              disabled={isAnalyzing}
              className="text-[10px] text-blue-500 hover:underline disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>

          <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Markdown components={markdownComponents}>{explanation.explanation}</Markdown>
          </div>

          <div className="text-[10px] text-gray-400 dark:text-gray-500">
            Generated {new Date(explanation.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
