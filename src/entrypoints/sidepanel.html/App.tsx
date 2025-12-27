import React, { useEffect, useState } from 'react';
import { useRequestStore, initializeSidepanel, initializeTabListener } from './stores/requestStore';
import FilterBar from '@/components/FilterBar';
import RequestList from '@/components/RequestList';
import RequestDetail from '@/components/RequestDetail';
import Timeline from '@/components/Timeline';
import FlowView from '@/components/FlowView';
import IssuePanel from '@/components/IssuePanel';
import SettingsModal from '@/components/SettingsModal';
import SessionSummaryPanel from '@/components/SessionSummary';
import ExportMenu from '@/components/ExportMenu';
import ChatBox from '@/components/ChatBox';

type ViewMode = 'list' | 'timeline' | 'flow';
type AITab = 'summary' | 'ordering' | 'discrepancies';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isInitialized, setIsInitialized] = useState(false);
  const [issuePanelCollapsed, setIssuePanelCollapsed] = useState(true);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(true);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeAITab, setActiveAITab] = useState<AITab>('summary');

  const {
    selectedRequest,
    filteredRequests,
    clearRequests,
    getAdFlows,
    sessionSummary,
    discrepancyPredictions,
    orderingAnalysis,
    isAnalyzing,
    aiError,
    streamingText,
    analyzeSession,
    analyzeOrdering,
    predictDiscrepancies,
  } = useRequestStore();

  const requests = filteredRequests();
  const flows = getAdFlows();

  useEffect(() => {
    // Initialize sidepanel with current tab
    initializeSidepanel().then((tabId) => {
      if (tabId) {
        setIsInitialized(true);
      }
    });

    // Listen for tab changes
    initializeTabListener();
  }, []);

  const handleClear = () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
    clearRequests();
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252526]">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-sm">AdFlow</h1>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          <div className="flex rounded overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-xs ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title="List View"
            >
              List
            </button>
            <button
              onClick={() => setViewMode('flow')}
              className={`px-2 py-1 text-xs ${
                viewMode === 'flow'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title="Flow View"
            >
              Flow
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2 py-1 text-xs ${
                viewMode === 'timeline'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title="Timeline View"
            >
              Time
            </button>
          </div>

          {/* Export menu */}
          <ExportMenu
            requests={requests}
            flows={flows}
            sessionSummary={sessionSummary}
            predictions={discrepancyPredictions}
          />

          {/* Clear button */}
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Clear requests"
          >
            Clear
          </button>

          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar />

      {/* Issue panel - collapsed by default in sidepanel */}
      <IssuePanel
        collapsed={issuePanelCollapsed}
        onToggle={() => setIssuePanelCollapsed(!issuePanelCollapsed)}
      />

      {/* AI Analysis panel */}
      <SessionSummaryPanel
        summary={sessionSummary}
        predictions={discrepancyPredictions}
        orderingAnalysis={orderingAnalysis}
        isLoading={isAnalyzing}
        error={aiError}
        streamingText={streamingText}
        activeAITab={activeAITab}
        onTabChange={setActiveAITab}
        onAnalyze={analyzeSession}
        onAnalyzeOrdering={analyzeOrdering}
        onPredictDiscrepancies={predictDiscrepancies}
        collapsed={aiPanelCollapsed}
        onToggle={() => setAiPanelCollapsed(!aiPanelCollapsed)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Request list/flow/timeline - always takes full width in sidepanel */}
        <div className={`${selectedRequest ? 'h-1/2' : 'flex-1'} overflow-auto`}>
          {!isInitialized ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
              <svg
                className="w-10 h-10 mb-2 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-center">No ad requests captured</p>
              <p className="text-xs mt-1 text-center">Navigate to a page with ads to see requests</p>
            </div>
          ) : viewMode === 'list' ? (
            <RequestList requests={requests} />
          ) : viewMode === 'flow' ? (
            <FlowView requests={requests} />
          ) : (
            <Timeline requests={requests} />
          )}
        </div>

        {/* Request detail panel - shown below in sidepanel */}
        {selectedRequest && (
          <div className="h-1/2 border-t border-gray-200 dark:border-gray-700 overflow-auto">
            <RequestDetail request={selectedRequest} />
          </div>
        )}
      </div>

      {/* Chat Box */}
      <ChatBox
        collapsed={chatCollapsed}
        onToggle={() => setChatCollapsed(!chatCollapsed)}
      />

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
