import React from 'react';
import { useRequestStoreContext } from '@/contexts/RequestStoreContext';
import type { HeaderBiddingAnalysis, BidLatencyMetrics, ConflictDetection } from '@/lib/types';

export default function HeaderBiddingPanel() {
  const analysis = useRequestStoreContext((state) => {
    try {
      return state.getHeaderBiddingAnalysis();
    } catch (error) {
      return null;
    }
  });

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6">
        <svg className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">No header bidding data available</p>
        <p className="text-xs mt-1">Header bidding analysis will appear as requests are captured</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-6">
      {/* Setup Detection Section */}
      <SetupSection analysis={analysis} />

      {/* Bid Latency Section */}
      <BidLatencySection analysis={analysis} />

      {/* Conflict Detection Section */}
      {analysis.conflicts && analysis.conflicts.length > 0 && (
        <ConflictSection conflicts={analysis.conflicts} />
      )}
    </div>
  );
}

function SetupSection({ analysis }: { analysis: HeaderBiddingAnalysis }) {
  const setupLabels: Record<string, { label: string; color: string; icon: string }> = {
    prebid: { label: 'Prebid.js', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', icon: '⚡' },
    'prebid-server': { label: 'Prebid Server', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', icon: '⚡' },
    'other-header-bidding': { label: 'Other Header Bidding', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: '🔗' },
    'waterfall-only': { label: 'Waterfall Only', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: '📊' },
    mixed: { label: 'Mixed Setup', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', icon: '🔄' },
    unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: '❓' },
  };

  const setupInfo = setupLabels[analysis.setup] || setupLabels.unknown;

  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Header Bidding Setup
      </h2>
      
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{setupInfo.icon}</span>
        <span className={`px-3 py-1 rounded text-sm font-medium ${setupInfo.color}`}>
          {setupInfo.label}
        </span>
      </div>

      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
        {analysis.prebidDetected && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Prebid.js detected</span>
          </div>
        )}
        {analysis.prebidServerDetected && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Prebid Server detected</span>
          </div>
        )}
        {!analysis.prebidDetected && !analysis.prebidServerDetected && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>No Prebid detected</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BidLatencySection({ analysis }: { analysis: HeaderBiddingAnalysis }) {
  if (!analysis.latencyAnalysis) {
    return (
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Bid Latency Analysis
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">No latency data available</p>
      </div>
    );
  }

  const { overall, byVendor, slowVendors, timeoutVendors } = analysis.latencyAnalysis;

  if (overall.totalBidRequests === 0) {
    return (
      <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Bid Latency Analysis
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">No bid requests detected</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Bid Latency Analysis
      </h2>

      {/* Overall Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Requests</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {overall.totalBidRequests}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Responses</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {overall.totalBidResponses}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Response Rate</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {(overall.responseRate * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Latency</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {overall.avgLatency > 0 ? `${Math.round(overall.avgLatency)}ms` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {((slowVendors && slowVendors.length > 0) || (timeoutVendors && timeoutVendors.length > 0)) && (
        <div className="mb-4 space-y-2">
          {slowVendors && slowVendors.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-amber-700 dark:text-amber-300">
                Slow vendors: {slowVendors.join(', ')}
              </span>
            </div>
          )}
          {timeoutVendors && timeoutVendors.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 dark:text-red-300">
                High timeout rate: {timeoutVendors.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Vendor Performance Table */}
      {byVendor && byVendor.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Vendor</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Requests</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Responses</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Avg</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Min</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Max</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">P95</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Timeouts</th>
              </tr>
            </thead>
            <tbody>
              {byVendor.map((vendor) => (
                <VendorRow key={vendor.vendor} metrics={vendor} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VendorRow({ metrics }: { metrics: BidLatencyMetrics }) {
  const isSlow = metrics.avgLatency > 3000;
  const hasHighTimeoutRate = metrics.timeoutRate > 0.1;
  const rowColor = hasHighTimeoutRate
    ? 'bg-red-50 dark:bg-red-900/10'
    : isSlow
    ? 'bg-amber-50 dark:bg-amber-900/10'
    : '';

  return (
    <tr className={`border-b border-gray-100 dark:border-gray-800 ${rowColor}`}>
      <td className="py-2 px-2 font-medium text-gray-900 dark:text-gray-100">
        {metrics.vendor}
      </td>
      <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">
        {metrics.requestCount}
      </td>
      <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">
        {metrics.responseCount}
      </td>
      <td className="py-2 px-2 text-right">
        <span className={isSlow ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
          {metrics.avgLatency > 0 ? `${Math.round(metrics.avgLatency)}ms` : 'N/A'}
        </span>
      </td>
      <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">
        {metrics.minLatency > 0 ? `${Math.round(metrics.minLatency)}ms` : 'N/A'}
      </td>
      <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">
        {metrics.maxLatency > 0 ? `${Math.round(metrics.maxLatency)}ms` : 'N/A'}
      </td>
      <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">
        {metrics.p95Latency > 0 ? `${Math.round(metrics.p95Latency)}ms` : 'N/A'}
      </td>
      <td className="py-2 px-2 text-right">
        <span className={hasHighTimeoutRate ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
          {metrics.timeoutCount} ({(metrics.timeoutRate * 100).toFixed(1)}%)
        </span>
      </td>
    </tr>
  );
}

function ConflictSection({ conflicts }: { conflicts: ConflictDetection[] }) {
  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Conflict Detection
        <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-[10px]">
          {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
        </span>
      </h2>

      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <ConflictCard key={index} conflict={conflict} />
        ))}
      </div>
    </div>
  );
}

function ConflictCard({ conflict }: { conflict: ConflictDetection }) {
  const severityColors = {
    error: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20',
    warning: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20',
  };

  const iconColors = {
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className={`border rounded-lg p-3 ${severityColors[conflict.severity]}`}>
      <div className="flex items-start gap-2 mb-2">
        <svg className={`w-5 h-5 ${iconColors[conflict.severity]} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
          {conflict.severity === 'error' ? (
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          )}
        </svg>
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
            {conflict.message}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {conflict.details}
          </div>
          {conflict.slotId && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
              Slot: {conflict.slotId}
            </div>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Flow ID: {conflict.flowId.substring(0, 20)}...
          </div>
        </div>
      </div>
    </div>
  );
}

