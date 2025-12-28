import { create } from 'zustand';
import type { EnrichedRequest, FilterState, VendorCategory, RequestType, MessageType, IssueType, AIExplanation, AdFlow, SlotInfo, SelectedElement, FrameInfo } from '@/lib/types';
import { groupRequestsIntoFlows } from '@/lib/adflow';
import * as aiService from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import type { RequestStore } from '@/stores/types';

// Helper to create a cache key from filtered request IDs and filters
function createCacheKey(requestIds: string[], filters: FilterState): string {
  const filterStr = JSON.stringify(filters);
  const requestStr = requestIds.join(',');
  return `${filterStr}|${requestStr}`;
}

interface SidepanelRequestStore extends RequestStore {
  // Additional sidepanel-specific state
  currentTabId: number | null;
  setCurrentTabId: (tabId: number | null) => void;

  // Cache keys for AI results
  sessionSummaryCacheKey: string | null;
  orderingAnalysisCacheKey: string | null;
  discrepanciesCacheKey: string | null;
}

const initialFilters: FilterState = {
  vendors: [],
  categories: [],
  requestTypes: [],
  statusCodes: [],
  issueTypes: [],
  searchQuery: '',
  showOnlyIssues: false,
};

export const useRequestStore = create<SidepanelRequestStore>((set, get) => ({
  requests: [],
  selectedRequest: null,
  filters: initialFilters,
  currentTabId: null,

  // Slot mappings
  slotMappings: [],

  // Element Inspector state
  isPickerActive: false,
  inspectedElement: null,
  frameHierarchy: [],

  // AI State
  aiExplanations: {},
  sessionSummary: null,
  discrepancyPredictions: null,
  orderingAnalysis: null,
  isAnalyzing: false,
  aiError: null,
  streamingText: '',

  // Chat state
  chatMessages: [],
  chatStreamingText: '',
  isChatting: false,
  chatError: null,

  // Cache keys
  sessionSummaryCacheKey: null,
  orderingAnalysisCacheKey: null,
  discrepanciesCacheKey: null,

  setCurrentTabId: (tabId) => set({ currentTabId: tabId }),

  addRequest: (request) =>
    set((state) => {
      // Prevent duplicates by checking if request ID already exists
      if (state.requests.some(r => r.id === request.id)) {
        return state;
      }
      return { requests: [...state.requests, request] };
    }),

  updateRequest: (id, updates) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
      selectedRequest:
        state.selectedRequest?.id === id
          ? { ...state.selectedRequest, ...updates }
          : state.selectedRequest,
    })),

  setRequests: (requests) => set({ requests }),

  selectRequest: (request) => set({ selectedRequest: request }),

  clearRequests: () =>
    set({
      requests: [],
      selectedRequest: null,
      slotMappings: [],
    }),

  setSlotMappings: (slots) => set({ slotMappings: slots }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  toggleVendorFilter: (vendorId) =>
    set((state) => {
      const vendors = state.filters.vendors.includes(vendorId)
        ? state.filters.vendors.filter((v) => v !== vendorId)
        : [...state.filters.vendors, vendorId];
      return { filters: { ...state.filters, vendors } };
    }),

  toggleCategoryFilter: (category) =>
    set((state) => {
      const categories = state.filters.categories.includes(category)
        ? state.filters.categories.filter((c) => c !== category)
        : [...state.filters.categories, category];
      return { filters: { ...state.filters, categories } };
    }),

  toggleRequestTypeFilter: (type) =>
    set((state) => {
      const requestTypes = state.filters.requestTypes.includes(type)
        ? state.filters.requestTypes.filter((t) => t !== type)
        : [...state.filters.requestTypes, type];
      return { filters: { ...state.filters, requestTypes } };
    }),

  toggleStatusFilter: (status) =>
    set((state) => {
      const statusCodes = state.filters.statusCodes.includes(status)
        ? state.filters.statusCodes.filter((s) => s !== status)
        : [...state.filters.statusCodes, status];
      return { filters: { ...state.filters, statusCodes } };
    }),

  toggleIssueTypeFilter: (issueType) =>
    set((state) => {
      const issueTypes = state.filters.issueTypes.includes(issueType)
        ? state.filters.issueTypes.filter((t) => t !== issueType)
        : [...state.filters.issueTypes, issueType];
      return { filters: { ...state.filters, issueTypes } };
    }),

  toggleShowOnlyIssues: () =>
    set((state) => ({
      filters: { ...state.filters, showOnlyIssues: !state.filters.showOnlyIssues },
    })),

  setSearchQuery: (query) =>
    set((state) => ({
      filters: { ...state.filters, searchQuery: query },
    })),

  setPlacementFilter: (elementId) =>
    set((state) => ({
      filters: { ...state.filters, placementFilter: elementId },
    })),

  setInspectedElement: (element) =>
    set((state) => ({
      inspectedElement: element,
      filters: { ...state.filters, inspectedElement: element || undefined },
    })),

  resetFilters: () => set({
    filters: initialFilters,
    inspectedElement: null,
  }),

  // Element Inspector Actions
  startElementPicker: async () => {
    const tabId = get().currentTabId;
    if (!tabId) {
      console.warn('[AdFlow Store] No tab ID available');
      return;
    }

    set({ isPickerActive: true });

    try {
      await chrome.runtime.sendMessage({
        type: 'START_ELEMENT_PICKER',
        tabId,
      });
    } catch (err) {
      console.error('[AdFlow Store] Failed to start element picker:', err);
      set({ isPickerActive: false });
    }
  },

  stopElementPicker: async () => {
    const tabId = get().currentTabId;
    if (!tabId) return;

    set({ isPickerActive: false });

    try {
      await chrome.runtime.sendMessage({
        type: 'STOP_ELEMENT_PICKER',
        tabId,
      });
    } catch (err) {
      console.error('[AdFlow Store] Failed to stop element picker:', err);
    }
  },

  clearInspectedElement: () => {
    set((state) => ({
      inspectedElement: null,
      filters: { ...state.filters, inspectedElement: undefined },
    }));

    const tabId = get().currentTabId;
    if (tabId) {
      chrome.runtime.sendMessage({
        type: 'CLEAR_HIGHLIGHT',
        tabId,
      }).catch(() => {});
    }
  },

  filteredRequests: () => {
    const { requests, filters } = get();

    return requests.filter((request) => {
      // Vendor filter
      if (filters.vendors.length > 0) {
        if (!request.vendor || !filters.vendors.includes(request.vendor.id)) {
          return false;
        }
      }

      // Category filter
      if (filters.categories.length > 0) {
        if (
          !request.vendor ||
          !filters.categories.includes(request.vendor.category)
        ) {
          return false;
        }
      }

      // Request type filter
      if (filters.requestTypes.length > 0) {
        if (
          !request.vendorRequestType ||
          !filters.requestTypes.includes(request.vendorRequestType)
        ) {
          return false;
        }
      }

      // Status code filter
      if (filters.statusCodes.length > 0) {
        const statusGroup = request.error
          ? 'error'
          : request.statusCode
          ? (`${Math.floor(request.statusCode / 100)}xx` as '2xx' | '3xx' | '4xx' | '5xx')
          : null;

        if (!statusGroup || !filters.statusCodes.includes(statusGroup)) {
          return false;
        }
      }

      // Show only issues filter
      if (filters.showOnlyIssues) {
        if (!request.issues || request.issues.length === 0) {
          return false;
        }
      }

      // Issue type filter
      if (filters.issueTypes.length > 0) {
        if (!request.issues || request.issues.length === 0) {
          return false;
        }
        const requestIssueTypes = request.issues.map((i) => i.type);
        const hasMatchingIssue = filters.issueTypes.some((t) =>
          requestIssueTypes.includes(t)
        );
        if (!hasMatchingIssue) {
          return false;
        }
      }

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesUrl = request.url.toLowerCase().includes(query);
        const matchesVendor = request.vendor?.name
          .toLowerCase()
          .includes(query);
        if (!matchesUrl && !matchesVendor) {
          return false;
        }
      }

      // Placement filter - filter by elementId or slotId
      if (filters.placementFilter) {
        // Find the slot info for the selected placement
        const selectedSlot = get().slotMappings.find(s => s.elementId === filters.placementFilter);

        if (selectedSlot) {
          // Match by elementId (exact)
          const matchesElementId = request.elementId === selectedSlot.elementId;

          // Match by slotId - handle various formats
          const matchesSlotId = request.slotId && (
            request.slotId === selectedSlot.slotId ||
            request.slotId.includes(selectedSlot.slotId) ||
            selectedSlot.slotId.includes(request.slotId) ||
            request.slotId.split('/').pop() === selectedSlot.slotId.split('/').pop()
          );

          // Also check if request URL contains the slot identifiers
          const urlMatchesSlot =
            request.url.includes(encodeURIComponent(selectedSlot.slotId)) ||
            request.url.includes(selectedSlot.elementId) ||
            request.url.includes(`iu=${encodeURIComponent(selectedSlot.slotId)}`) ||
            request.url.includes(`iu=${selectedSlot.slotId.replace(/\//g, '%2F')}`);

          if (!matchesElementId && !matchesSlotId && !urlMatchesSlot) {
            return false;
          }
        } else {
          // Fallback: direct match if slot info not found
          const matchesElementId = request.elementId === filters.placementFilter;
          const matchesSlotId = request.slotId?.includes(filters.placementFilter) ||
            filters.placementFilter.includes(request.slotId || '');
          if (!matchesElementId && !matchesSlotId) {
            return false;
          }
        }
      }

      // Inspected element filter - filter by frameId and direct URLs
      if (filters.inspectedElement) {
        const element = filters.inspectedElement;

        // Build set of all relevant frameIds (element's frame + child iframe frames)
        const relevantFrameIds = new Set<number>([element.frameId]);
        element.childFrameIds?.forEach(id => relevantFrameIds.add(id));

        // Match by frameId (element's frame or any child iframe frame)
        const matchesFrameId = relevantFrameIds.has(request.frameId);

        // Match by direct URLs (for img, script, etc.)
        const matchesDirectUrl = element.directUrls.some(url => {
          if (request.url === url) return true;
          if (request.url.includes(url)) return true;
          try {
            const reqUrl = new URL(request.url);
            if (url.startsWith('/') && reqUrl.pathname === url) return true;
            if (reqUrl.href.includes(url)) return true;
            // Also try matching hostname for cross-origin cases
            try {
              const elementUrl = new URL(url, window.location.href);
              if (reqUrl.hostname === elementUrl.hostname && reqUrl.pathname === elementUrl.pathname) {
                return true;
              }
            } catch {
              // Invalid element URL, skip
            }
          } catch {
            // Invalid URL, skip
          }
          return false;
        });

        // For iframes, also check if the request URL matches the iframe src
        const matchesIframeSrc = element.tagName === 'iframe' && element.src && (() => {
          try {
            const iframeUrl = new URL(element.src, window.location.href);
            const reqUrl = new URL(request.url);
            // Match by hostname and pathname
            return reqUrl.hostname === iframeUrl.hostname && 
                   (reqUrl.pathname === iframeUrl.pathname || request.url.includes(iframeUrl.hostname));
          } catch {
            // Fallback to simple string matching
            return request.url.includes(element.src);
          }
        })();

        // Also check if the inspected element corresponds to an ad slot
        // Match by elementId (if the element has an id that matches request.elementId)
        const matchesElementId = element.id && request.elementId === element.id;

        // Match by slotId (if we can find a slot mapping for this element)
        let matchesSlotId = false;
        if (element.id) {
          const slotMapping = get().slotMappings.find(s => s.elementId === element.id);
          if (slotMapping) {
            // Match by slotId - handle various formats
            matchesSlotId = request.slotId && (
              request.slotId === slotMapping.slotId ||
              request.slotId.includes(slotMapping.slotId) ||
              slotMapping.slotId.includes(request.slotId) ||
              request.slotId.split('/').pop() === slotMapping.slotId.split('/').pop()
            );

            // Also check if request URL contains the slot identifiers
            if (!matchesSlotId) {
              matchesSlotId = 
                request.url.includes(encodeURIComponent(slotMapping.slotId)) ||
                request.url.includes(slotMapping.elementId) ||
                request.url.includes(`iu=${encodeURIComponent(slotMapping.slotId)}`) ||
                request.url.includes(`iu=${slotMapping.slotId.replace(/\//g, '%2F')}`);
            }
          }
        }

        if (!matchesFrameId && !matchesDirectUrl && !matchesIframeSrc && !matchesElementId && !matchesSlotId) {
          return false;
        }
      }

      return true;
    });
  },

  getIssueCounts: () => {
    const { requests } = get();
    const counts: { total: number; byType: Record<IssueType, number> } = {
      total: 0,
      byType: {
        timeout: 0,
        failed: 0,
        duplicate_pixel: 0,
        out_of_order: 0,
        slow_response: 0,
      },
    };

    for (const request of requests) {
      if (request.issues) {
        for (const issue of request.issues) {
          counts.total++;
          counts.byType[issue.type]++;
        }
      }
    }

    return counts;
  },

  getAdFlows: () => {
    const { requests } = get();
    return groupRequestsIntoFlows(requests);
  },

  // AI Actions
  explainRequest: async (request) => {
    set({ isAnalyzing: true, aiError: null, streamingText: '' });
    try {
      const explanation = await aiService.explainRequest(request, (chunk) => {
        set((state) => ({ streamingText: state.streamingText + chunk }));
      });
      set((state) => ({
        aiExplanations: {
          ...state.aiExplanations,
          [request.id]: explanation,
        },
        isAnalyzing: false,
        streamingText: '',
      }));
    } catch (error) {
      set({
        aiError: error instanceof Error ? error.message : 'Failed to explain request',
        isAnalyzing: false,
        streamingText: '',
      });
    }
  },

  analyzeSession: async () => {
    const { filteredRequests, filters, sessionSummary, sessionSummaryCacheKey } = get();
    const requests = filteredRequests();
    const requestIds = requests.map(r => r.id);
    const currentCacheKey = createCacheKey(requestIds, filters);

    // Return cached result if available
    if (sessionSummary && sessionSummaryCacheKey === currentCacheKey) {
      return;
    }

    set({ isAnalyzing: true, aiError: null, streamingText: '', sessionSummary: null });
    try {
      const flows = groupRequestsIntoFlows(requests);
      const summary = await aiService.analyzeSession(requests, flows, (chunk) => {
        set((state) => ({ streamingText: state.streamingText + chunk }));
      });
      set({
        sessionSummary: summary,
        sessionSummaryCacheKey: currentCacheKey,
        isAnalyzing: false,
        streamingText: ''
      });
    } catch (error) {
      set({
        aiError: error instanceof Error ? error.message : 'Failed to analyze session',
        isAnalyzing: false,
        streamingText: '',
      });
    }
  },

  analyzeOrdering: async () => {
    const { filteredRequests, filters, orderingAnalysis, orderingAnalysisCacheKey } = get();
    const requests = filteredRequests();
    const requestIds = requests.map(r => r.id);
    const currentCacheKey = createCacheKey(requestIds, filters);

    // Return cached result if available
    if (orderingAnalysis && orderingAnalysisCacheKey === currentCacheKey) {
      return;
    }

    set({ isAnalyzing: true, aiError: null, streamingText: '', orderingAnalysis: null });
    try {
      const analysis = await aiService.analyzeOrderingIssues(requests, (chunk) => {
        set((state) => ({ streamingText: state.streamingText + chunk }));
      });
      set({
        orderingAnalysis: analysis,
        orderingAnalysisCacheKey: currentCacheKey,
        isAnalyzing: false,
        streamingText: ''
      });
    } catch (error) {
      set({
        aiError: error instanceof Error ? error.message : 'Failed to analyze ordering',
        isAnalyzing: false,
        streamingText: '',
      });
    }
  },

  predictDiscrepancies: async () => {
    const { filteredRequests, filters, discrepancyPredictions, discrepanciesCacheKey } = get();
    const requests = filteredRequests();
    const requestIds = requests.map(r => r.id);
    const currentCacheKey = createCacheKey(requestIds, filters);

    // Return cached result if available
    if (discrepancyPredictions && discrepanciesCacheKey === currentCacheKey) {
      return;
    }

    set({ isAnalyzing: true, aiError: null, streamingText: '', discrepancyPredictions: null });
    try {
      const flows = groupRequestsIntoFlows(requests);
      const predictions = await aiService.predictDiscrepancies(requests, flows, (chunk) => {
        set((state) => ({ streamingText: state.streamingText + chunk }));
      });
      set({
        discrepancyPredictions: predictions,
        discrepanciesCacheKey: currentCacheKey,
        isAnalyzing: false,
        streamingText: ''
      });
    } catch (error) {
      set({
        aiError: error instanceof Error ? error.message : 'Failed to predict discrepancies',
        isAnalyzing: false,
        streamingText: '',
      });
    }
  },

  clearAIState: () => {
    set({
      aiExplanations: {},
      sessionSummary: null,
      discrepancyPredictions: null,
      orderingAnalysis: null,
      aiError: null,
      streamingText: '',
      sessionSummaryCacheKey: null,
      orderingAnalysisCacheKey: null,
      discrepanciesCacheKey: null,
    });
  },

  sendChatMessage: async (message: string) => {
    const { filteredRequests, selectedRequest, chatMessages } = get();
    const requests = filteredRequests();

    // Add user message immediately
    const userMessage: ChatMessage = { role: 'user', content: message };
    set({
      chatMessages: [...chatMessages, userMessage],
      isChatting: true,
      chatError: null,
      chatStreamingText: '',
    });

    try {
      const response = await aiService.chat(
        message,
        chatMessages,
        requests,
        selectedRequest,
        (chunk) => {
          set((state) => ({ chatStreamingText: state.chatStreamingText + chunk }));
        }
      );

      // Add assistant response
      const assistantMessage: ChatMessage = { role: 'assistant', content: response };
      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMessage],
        isChatting: false,
        chatStreamingText: '',
      }));
    } catch (error) {
      set({
        chatError: error instanceof Error ? error.message : 'Failed to send message',
        isChatting: false,
        chatStreamingText: '',
      });
    }
  },

  clearChat: () => {
    set({
      chatMessages: [],
      chatStreamingText: '',
      chatError: null,
      isChatting: false,
    });
  },
}));

// Get current active tab ID
export async function getCurrentTabId(): Promise<number | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id ?? null;
  } catch (e) {
    console.error('Failed to get current tab:', e);
    return null;
  }
}

// Set up message listener for background script communication
export function initializeMessageListener() {
  const store = useRequestStore.getState();

  chrome.runtime.onMessage.addListener((message: MessageType) => {
    const currentTabId = store.currentTabId;

    // Filter messages by tabId for tab-specific messages
    if (message.payload?.tabId !== undefined && message.payload.tabId !== currentTabId) {
      // Message is for a different tab, ignore it
      if (message.type !== 'CLEAR_REQUESTS') {
        return;
      }
    }

    switch (message.type) {
      case 'REQUEST_START':
        store.addRequest(message.payload);
        break;

      case 'REQUEST_COMPLETE':
        store.updateRequest(message.payload.id, {
          statusCode: message.payload.statusCode,
          duration: message.payload.duration,
          responseHeaders: message.payload.responseHeaders,
          issues: message.payload.issues,
          completed: true,
        });
        break;

      case 'REQUEST_ERROR':
        store.updateRequest(message.payload.id, {
          error: message.payload.error,
          issues: message.payload.issues,
          completed: true,
        });
        break;

      case 'ISSUES_DETECTED':
        store.updateRequest(message.payload.requestId, {
          issues: message.payload.issues,
        });
        break;

      case 'CLEAR_REQUESTS':
        store.clearRequests();
        store.clearAIState();
        break;

      case 'PAGE_NAVIGATED':
        // tabId check already done above
        store.clearRequests();
        store.clearAIState();
        break;

      case 'SLOT_MAPPINGS_UPDATED':
        if (message.payload?.slots) {
          store.setSlotMappings(message.payload.slots);
        }
        break;

      case 'ELEMENT_SELECTED':
        if (message.payload?.element) {
          // Clear any previous selection first, then set the new one
          // This ensures only one element is selected at a time
          store.clearInspectedElement();
          useRequestStore.setState({
            isPickerActive: false,
            inspectedElement: message.payload.element,
          });
          store.setInspectedElement(message.payload.element);
        }
        break;

      case 'ELEMENT_PICKER_STOPPED':
        store.clearInspectedElement();
        useRequestStore.setState({ isPickerActive: false });
        break;

      case 'CLEAR_INSPECTED_ELEMENT':
        store.clearInspectedElement();
        break;
    }
  });
}

// Fetch initial requests for current tab
export async function fetchInitialRequests(tabId: number) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_REQUESTS',
      tabId,
    });

    if (response?.type === 'REQUESTS_DATA') {
      useRequestStore.getState().setRequests(response.payload);
    }
  } catch (e) {
    console.error('Failed to fetch initial requests:', e);
  }
}

// Fetch initial slot mappings for current tab
export async function fetchInitialSlotMappings(tabId: number) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SLOT_MAPPINGS',
      tabId,
    });

    if (response?.type === 'SLOT_MAPPINGS_DATA' && response.payload?.slots) {
      useRequestStore.getState().setSlotMappings(response.payload.slots);
    }
  } catch (e) {
    console.error('Failed to fetch initial slot mappings:', e);
  }
}

// Initialize sidepanel with current tab
export async function initializeSidepanel() {
  const tabId = await getCurrentTabId();
  if (tabId) {
    useRequestStore.getState().setCurrentTabId(tabId);
    initializeMessageListener();
    await Promise.all([
      fetchInitialRequests(tabId),
      fetchInitialSlotMappings(tabId),
    ]);
  }
  return tabId;
}

// Listen for tab activation changes
export function initializeTabListener() {
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const store = useRequestStore.getState();
    const newTabId = activeInfo.tabId;

    if (newTabId !== store.currentTabId) {
      // Clear data and reinitialize for the new tab
      store.clearRequests();
      store.clearAIState();
      store.setCurrentTabId(newTabId);
      await Promise.all([
        fetchInitialRequests(newTabId),
        fetchInitialSlotMappings(newTabId),
      ]);
    }
  });
}
