import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRequestStore } from '@/contexts/RequestStoreContext';
import { CategoryBadge } from './VendorBadge';
import ElementInspector from './ElementInspector';
import type { VendorCategory, RequestType, IssueType, Vendor } from '@/lib/types';
import { ISSUE_LABELS } from '@/lib/types';

const CATEGORIES: VendorCategory[] = [
  'SSP',
  'DSP',
  'Verification',
  'Measurement',
  'Prebid',
  'Identity',
  'CDN',
  'AdServer',
  'Other',
];

const REQUEST_TYPES: RequestType[] = [
  'bid_request',
  'impression',
  'viewability',
  'click',
  'sync',
  'creative',
];

const STATUS_CODES = ['2xx', '3xx', '4xx', '5xx', 'error'] as const;

const ISSUE_TYPES: IssueType[] = [
  'failed',
  'timeout',
  'slow_response',
  'duplicate_pixel',
  'out_of_order',
];

interface VendorsByCategory {
  category: VendorCategory;
  vendors: Vendor[];
}

// Get the current tab ID - works in both DevTools and side panel contexts
async function getCurrentTabId(): Promise<number | null> {
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
}

// Highlight the ad slot element on the page
async function highlightAdSlot(elementId: string, slotId?: string) {
  const tabId = await getCurrentTabId();
  if (!tabId) return;

  chrome.runtime.sendMessage({
    type: 'HIGHLIGHT_ELEMENT',
    tabId,
    payload: { elementId, slotId },
  }).catch((err) => {
    console.warn('[AdFlow] Failed to highlight element:', err);
  });
}

// Clear highlight from the page
async function clearAdSlotHighlight() {
  const tabId = await getCurrentTabId();
  if (!tabId) return;

  chrome.runtime.sendMessage({
    type: 'CLEAR_HIGHLIGHT',
    tabId,
  }).catch((err) => {
    console.warn('[AdFlow] Failed to clear highlight:', err);
  });
}

function PlacementDropdown() {
  const { slotMappings, filters, setPlacementFilter } = useRequestStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle slot selection - filter requests AND highlight on page
  const handleSlotSelect = (slot: { elementId: string; slotId: string }) => {
    setPlacementFilter(slot.elementId);
    highlightAdSlot(slot.elementId, slot.slotId);
    setIsOpen(false);
  };

  // Handle clearing the filter
  const handleClearFilter = () => {
    setPlacementFilter(undefined);
    clearAdSlotHighlight();
    setIsOpen(false);
  };

  const selectedSlot = slotMappings.find(s => s.elementId === filters.placementFilter);
  const hasSlots = slotMappings.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${
          filters.placementFilter
            ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
            : hasSlots
            ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
        }`}
        title={hasSlots ? `${slotMappings.length} ad slot(s) detected` : 'No GAM/Prebid slots detected on this page'}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <span>{selectedSlot ? selectedSlot.elementId : 'Ad Slots'}</span>
        {hasSlots && (
          <span className={`px-1 py-0.5 text-[10px] rounded-full min-w-[16px] text-center ${
            filters.placementFilter
              ? 'bg-purple-500 text-white'
              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}>
            {filters.placementFilter ? '1' : slotMappings.length}
          </span>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[250px] max-h-[300px] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg">
          {!hasSlots ? (
            <div className="px-3 py-4 text-xs text-center text-gray-500 dark:text-gray-400">
              <svg className="w-6 h-6 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No GAM or Prebid.js slots detected</p>
              <p className="text-[10px] mt-1 text-gray-400">Make sure the page uses googletag or pbjs</p>
            </div>
          ) : (
            <>
              {/* Clear selection option */}
              {filters.placementFilter && (
                <button
                  onClick={handleClearFilter}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
                >
                  Show all slots
                </button>
              )}

              {/* Group by type */}
              {['gam', 'prebid'].map((type) => {
                const slots = slotMappings.filter(s => s.type === type);
                if (slots.length === 0) return null;

                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 sticky top-0 uppercase">
                      {type === 'gam' ? 'Google Ad Manager' : 'Prebid.js'}
                    </div>
                    {slots.map((slot) => (
                      <button
                        key={slot.elementId}
                        onClick={() => handleSlotSelect(slot)}
                        className={`w-full flex flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          filters.placementFilter === slot.elementId ? 'bg-purple-50 dark:bg-purple-900/30' : ''
                        }`}
                      >
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {slot.elementId}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {slot.slotId}
                          {slot.sizes && ` (${slot.sizes.join(', ')})`}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function VendorDropdown() {
  const { requests, filters, toggleVendorFilter } = useRequestStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get unique vendors from requests, grouped by category
  const vendorsByCategory = useMemo(() => {
    const vendorMap = new Map<string, Vendor>();

    for (const request of requests) {
      if (request.vendor && !vendorMap.has(request.vendor.id)) {
        vendorMap.set(request.vendor.id, request.vendor);
      }
    }

    // Group by category
    const grouped = new Map<VendorCategory, Vendor[]>();
    for (const vendor of vendorMap.values()) {
      const existing = grouped.get(vendor.category) || [];
      existing.push(vendor);
      grouped.set(vendor.category, existing);
    }

    // Sort vendors within each category
    const result: VendorsByCategory[] = [];
    for (const category of CATEGORIES) {
      const vendors = grouped.get(category);
      if (vendors && vendors.length > 0) {
        vendors.sort((a, b) => a.name.localeCompare(b.name));
        result.push({ category, vendors });
      }
    }

    return result;
  }, [requests]);

  const totalVendors = vendorsByCategory.reduce((sum, g) => sum + g.vendors.length, 0);
  const selectedCount = filters.vendors.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (totalVendors === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${
          selectedCount > 0
            ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <span>Vendors</span>
        {selectedCount > 0 && (
          <span className="px-1 py-0.5 text-[10px] bg-blue-500 text-white rounded-full min-w-[16px] text-center">
            {selectedCount}
          </span>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] max-h-[300px] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg">
          {/* Clear selection option */}
          {selectedCount > 0 && (
            <button
              onClick={() => {
                filters.vendors.forEach((v) => toggleVendorFilter(v));
              }}
              className="w-full px-3 py-1.5 text-xs text-left text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
            >
              Clear selection ({selectedCount})
            </button>
          )}

          {vendorsByCategory.map(({ category, vendors }) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 sticky top-0">
                {category}
              </div>
              {vendors.map((vendor) => (
                <label
                  key={vendor.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={filters.vendors.includes(vendor.id)}
                    onChange={() => toggleVendorFilter(vendor.id)}
                    className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{vendor.name}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterBar() {
  const {
    filters,
    toggleCategoryFilter,
    toggleRequestTypeFilter,
    toggleStatusFilter,
    toggleIssueTypeFilter,
    setSearchQuery,
    setSearchQueryRegex,
    setPayloadSearchQuery,
    setPayloadSearchRegex,
    resetFilters,
  } = useRequestStore();

  const [isPayloadSearchExpanded, setIsPayloadSearchExpanded] = useState(false);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.requestTypes.length > 0 ||
    filters.statusCodes.length > 0 ||
    filters.issueTypes.length > 0 ||
    filters.vendors.length > 0 ||
    filters.showOnlyIssues ||
    filters.searchQuery.length > 0 ||
    filters.payloadSearchQuery.length > 0 ||
    !!filters.placementFilter ||
    !!filters.inspectedElement;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252526]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        {/* Search input */}
        <div className="relative flex-shrink-0 flex items-center gap-1">
          <input
            type="text"
            placeholder="Filter by URL or vendor..."
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 px-2 py-1 pr-8 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
          />
          <div className="absolute right-1 flex items-center gap-0.5">
            {/* Regex toggle button */}
            <button
              onClick={() => setSearchQueryRegex(!filters.searchQueryRegex)}
              className={`px-1 py-0.5 text-[10px] font-mono rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                filters.searchQueryRegex
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title={filters.searchQueryRegex ? 'Disable regex mode' : 'Enable regex mode'}
            >
              .*
            </button>
            {/* Clear button */}
            {filters.searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Clear search"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

      {/* Vendor dropdown */}
      <VendorDropdown />

      {/* Placement/Slot dropdown */}
      <PlacementDropdown />

      {/* Element Inspector */}
      <ElementInspector />

      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Category filters */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 mr-1">Category:</span>
        {CATEGORIES.map((category) => (
          <CategoryBadge
            key={category}
            category={category}
            selected={filters.categories.includes(category)}
            onClick={() => toggleCategoryFilter(category)}
          />
        ))}
      </div>

      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Request type filters */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 mr-1">Type:</span>
        {REQUEST_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => toggleRequestTypeFilter(type)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${
              filters.requestTypes.includes(type)
                ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Status code filters */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 mr-1">Status:</span>
        {STATUS_CODES.map((status) => (
          <button
            key={status}
            onClick={() => toggleStatusFilter(status)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${
              filters.statusCodes.includes(status)
                ? status === 'error' || status === '4xx' || status === '5xx'
                  ? 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                  : 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Issue type filters */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 mr-1">Issues:</span>
        {ISSUE_TYPES.map((issueType) => (
          <button
            key={issueType}
            onClick={() => toggleIssueTypeFilter(issueType)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${
              filters.issueTypes.includes(issueType)
                ? 'bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {ISSUE_LABELS[issueType]}
          </button>
        ))}
      </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <button
              onClick={resetFilters}
              className="px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Reset filters
            </button>
          </>
        )}
      </div>

      {/* Collapsible Payload Search */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        {!isPayloadSearchExpanded ? (
          <button
            onClick={() => setIsPayloadSearchExpanded(true)}
            className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search in payloads</span>
              {filters.payloadSearchQuery && (
                <span className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded-full">
                  Active
                </span>
              )}
            </div>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="relative flex-1 flex items-center gap-1">
              <input
                type="text"
                placeholder="Search in decoded payloads..."
                value={filters.payloadSearchQuery}
                onChange={(e) => setPayloadSearchQuery(e.target.value)}
                className="flex-1 px-2 py-1 pr-8 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="absolute right-1 flex items-center gap-0.5">
                {/* Regex toggle button */}
                <button
                  onClick={() => setPayloadSearchRegex(!filters.payloadSearchRegex)}
                  className={`px-1 py-0.5 text-[10px] font-mono rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                    filters.payloadSearchRegex
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  title={filters.payloadSearchRegex ? 'Disable regex mode' : 'Enable regex mode'}
                >
                  .*
                </button>
                {/* Clear button */}
                {filters.payloadSearchQuery && (
                  <button
                    onClick={() => setPayloadSearchQuery('')}
                    className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Clear payload search"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* Collapse button */}
            <button
              onClick={() => setIsPayloadSearchExpanded(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Collapse payload search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
