import React, { useEffect, useState, useRef } from 'react';
import { useRequestStore, initializeMessageListener, fetchInitialRequests, fetchInitialSlotMappings, initializeNetworkListener, reinitializeForCurrentTab } from './stores/requestStore';
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
import HeaderBiddingPanel from '@/components/HeaderBiddingPanel';

type ViewMode = 'list' | 'timeline' | 'flow' | 'headerbidding';
type AITab = 'summary' | 'ordering' | 'discrepancies';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isInitialized, setIsInitialized] = useState(false);
  const [issuePanelCollapsed, setIssuePanelCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(true);
  const [chatCollapsed, setChatCollapsed] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeAITab, setActiveAITab] = useState<AITab>('summary');

  // Track the initial tabId to detect tab switches
  const initialTabIdRef = useRef<number | null>(null);

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
    // Store the initial tabId
    initialTabIdRef.current = chrome.devtools.inspectedWindow.tabId;

    // Initialize message listener and fetch initial data
    initializeMessageListener();
    initializeNetworkListener();
    Promise.all([
      fetchInitialRequests(),
      fetchInitialSlotMappings(),
    ]).then(() => {
      setIsInitialized(true);
    });

    // Listen for navigation events in the inspected window
    // This handles page refreshes and navigations within the same tab
    const handleNavigation = (url: string) => {
      // Check if the tabId has changed (can happen in some DevTools configurations)
      const currentTabId = chrome.devtools.inspectedWindow.tabId;
      if (initialTabIdRef.current !== null && initialTabIdRef.current !== currentTabId) {
        // Tab changed, reinitialize
        initialTabIdRef.current = currentTabId;
        reinitializeForCurrentTab();
      }
      // Otherwise, the background script's PAGE_NAVIGATED message will handle clearing
    };

    if (chrome.devtools?.inspectedWindow?.onNavigated) {
      chrome.devtools.inspectedWindow.onNavigated.addListener(handleNavigation);
    }

    return () => {
      if (chrome.devtools?.inspectedWindow?.onNavigated) {
        chrome.devtools.inspectedWindow.onNavigated.removeListener(handleNavigation);
      }
    };
  }, []);

  const handleClear = () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
    clearRequests();
  };

  const hasAIContent = sessionSummary || discrepancyPredictions || orderingAnalysis;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#252526]">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm">AdFlow Inspector</h1>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-xs ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
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
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('headerbidding')}
              className={`px-2 py-1 text-xs ${
                viewMode === 'headerbidding'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Header Bidding
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

      {/* Issue panel */}
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
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Request list or timeline */}
        <div className={`flex-1 min-w-0 overflow-auto ${selectedRequest ? 'w-1/2' : 'w-full'}`}>
          {!isInitialized ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading...
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <svg
                className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600"
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
              <p className="text-sm">No network requests captured</p>
              <p className="text-xs mt-1">Navigate or refresh the page to see requests</p>
            </div>
          ) : viewMode === 'list' ? (
            <RequestList requests={requests} />
          ) : viewMode === 'flow' ? (
            <FlowView requests={requests} />
          ) : viewMode === 'headerbidding' ? (
            <HeaderBiddingPanel />
          ) : (
            <Timeline requests={requests} />
          )}
        </div>

        {/* Request detail panel */}
        {selectedRequest && (
          <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 overflow-auto">
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
