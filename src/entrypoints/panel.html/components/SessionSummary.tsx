import React from 'react';
import Markdown from 'react-markdown';

// Markdown component styles for consistent rendering
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
    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-2 ml-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1 mb-2 ml-2">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-xs">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-800 dark:text-gray-200">{children}</strong>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[11px] font-mono">{children}</code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-[11px] font-mono overflow-x-auto mb-2">{children}</pre>
  ),
};

type AITab = 'summary' | 'ordering' | 'discrepancies';

interface SessionSummaryProps {
  summary: string | null;
  predictions: string | null;
  orderingAnalysis: string | null;
  isLoading: boolean;
  error: string | null;
  streamingText: string;
  activeAITab: AITab;
  onTabChange: (tab: AITab) => void;
  onAnalyze: () => void;
  onAnalyzeOrdering: () => void;
  onPredictDiscrepancies: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function SessionSummaryPanel({
  summary,
  predictions,
  orderingAnalysis,
  isLoading,
  error,
  streamingText,
  activeAITab,
  onTabChange,
  onAnalyze,
  onAnalyzeOrdering,
  onPredictDiscrepancies,
  collapsed,
  onToggle,
}: SessionSummaryProps) {
  const isStreaming = isLoading && streamingText.length > 0;

  const handleAnalyze = (e: React.MouseEvent, tab: AITab, action: () => void) => {
    e.stopPropagation();
    onTabChange(tab);
    action();
    // Auto-expand the panel when user triggers analysis
    if (collapsed) {
      onToggle();
    }
  };

  const getTabContent = () => {
    switch (activeAITab) {
      case 'summary':
        return { hasContent: !!summary, content: summary };
      case 'ordering':
        return { hasContent: !!orderingAnalysis, content: orderingAnalysis };
      case 'discrepancies':
        return { hasContent: !!predictions, content: predictions };
      default:
        return { hasContent: false, content: null };
    }
  };

  const { hasContent } = getTabContent();

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform ${
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
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            AI Analysis
          </span>
          {isLoading && (
            <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
              Analyzing...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => handleAnalyze(e, 'summary', onAnalyze)}
            disabled={isLoading}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              activeAITab === 'summary'
                ? 'bg-blue-500 text-white'
                : 'border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}
          >
            Summarize
            {summary && <span className="ml-1">✓</span>}
          </button>
          <button
            onClick={(e) => handleAnalyze(e, 'ordering', onAnalyzeOrdering)}
            disabled={isLoading}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              activeAITab === 'ordering'
                ? 'bg-blue-500 text-white'
                : 'border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}
          >
            Ordering
            {orderingAnalysis && <span className="ml-1">✓</span>}
          </button>
          <button
            onClick={(e) => handleAnalyze(e, 'discrepancies', onPredictDiscrepancies)}
            disabled={isLoading}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              activeAITab === 'discrepancies'
                ? 'bg-blue-500 text-white'
                : 'border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}
          >
            Discrepancies
            {predictions && <span className="ml-1">✓</span>}
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="px-3 pb-3 max-h-96 overflow-auto">
          {error && (
            <div className="mb-3 p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          {isLoading && !hasContent && !isStreaming && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm">Analyzing...</span>
              </div>
            </div>
          )}

          {/* Streaming text display */}
          {isStreaming && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                  Generating...
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded p-3">
                <Markdown components={markdownComponents}>{streamingText}</Markdown>
                <span className="inline-block w-1.5 h-3 bg-blue-500 animate-pulse" />
              </div>
            </div>
          )}

          {!hasContent && !isLoading && !error && !isStreaming && (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <p className="text-sm mb-2">No {activeAITab} analysis yet</p>
              <p className="text-xs">Click the button above to analyze</p>
            </div>
          )}

          {/* Session Summary Tab */}
          {activeAITab === 'summary' && summary && !isStreaming && (
            <div>
              <div className="bg-white dark:bg-gray-800 rounded p-3">
                <Markdown components={markdownComponents}>{summary}</Markdown>
              </div>
            </div>
          )}

          {/* Ordering Analysis Tab */}
          {activeAITab === 'ordering' && orderingAnalysis && !isStreaming && (
            <div>
              <div className="bg-white dark:bg-gray-800 rounded p-3">
                <Markdown components={markdownComponents}>{orderingAnalysis}</Markdown>
              </div>
            </div>
          )}

          {/* Discrepancy Predictions Tab */}
          {activeAITab === 'discrepancies' && predictions && !isStreaming && (
            <div>
              <div className="bg-white dark:bg-gray-800 rounded p-3">
                <Markdown components={markdownComponents}>{predictions}</Markdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
