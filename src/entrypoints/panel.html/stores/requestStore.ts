import { create } from 'zustand';
import type { EnrichedRequest, FilterState, VendorCategory, RequestType, MessageType, IssueType, AIExplanation, AdFlow, DecodedPayload, SlotInfo } from '@/lib/types';
import { groupRequestsIntoFlows } from '@/lib/adflow';
import * as aiService from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { decodeRequestBody } from '@/lib/decoders';

// Helper to create a cache key from filtered request IDs and filters
function createCacheKey(requestIds: string[], filters: FilterState): string {
  const filterStr = JSON.stringify(filters);
  const requestStr = requestIds.join(',');
  return `${filterStr}|${requestStr}`;
}

interface RequestStore {
  requests: EnrichedRequest[];
  selectedRequest: EnrichedRequest | null;
  filters: FilterState;

  // Slot mappings from GAM/Prebid
  slotMappings: SlotInfo[];

  // AI State - all responses stored as raw markdown text
  aiExplanations: Record<string, AIExplanation>;
  sessionSummary: string | null;
  discrepancyPredictions: string | null;
  orderingAnalysis: string | null;
  isAnalyzing: boolean;
  aiError: string | null;
  streamingText: string;

  // Chat state
  chatMessages: ChatMessage[];
  chatStreamingText: string;
  isChatting: boolean;
  chatError: string | null;

  // Cache keys for AI results
  sessionSummaryCacheKey: string | null;
  orderingAnalysisCacheKey: string | null;
  discrepanciesCacheKey: string | null;

  // Actions
  addRequest: (request: EnrichedRequest) => void;
  updateRequest: (id: string, updates: Partial<EnrichedRequest>) => void;
  setRequests: (requests: EnrichedRequest[]) => void;
  selectRequest: (request: EnrichedRequest | null) => void;
  clearRequests: () => void;
  setSlotMappings: (slots: SlotInfo[]) => void;

  // Filter actions
  setFilters: (filters: Partial<FilterState>) => void;
  toggleVendorFilter: (vendorId: string) => void;
  toggleCategoryFilter: (category: VendorCategory) => void;
  toggleRequestTypeFilter: (type: RequestType) => void;
  toggleStatusFilter: (status: '2xx' | '3xx' | '4xx' | '5xx' | 'error') => void;
  toggleIssueTypeFilter: (issueType: IssueType) => void;
  toggleShowOnlyIssues: () => void;
  setSearchQuery: (query: string) => void;
  setPlacementFilter: (elementId: string | undefined) => void;
  resetFilters: () => void;

  // AI Actions
  explainRequest: (request: EnrichedRequest) => Promise<void>;
  analyzeSession: () => Promise<void>;
  analyzeOrdering: () => Promise<void>;
  predictDiscrepancies: () => Promise<void>;
  clearAIState: () => void;

  // Chat Actions
  sendChatMessage: (message: string) => Promise<void>;
  clearChat: () => void;

  // Computed
  filteredRequests: () => EnrichedRequest[];
  getIssueCounts: () => { total: number; byType: Record<IssueType, number> };
  getAdFlows: () => AdFlow[];
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

export const useRequestStore = create<RequestStore>((set, get) => ({
  requests: [],
  selectedRequest: null,
  filters: initialFilters,

  // Slot mappings
  slotMappings: [],

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

  resetFilters: () => set({ filters: initialFilters }),

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

          // Match by slotId - handle various formats:
          // GAM slots: "/1234567/homepage/leaderboard"
          // Request slotId might be full path or partial
          const matchesSlotId = request.slotId && (
            request.slotId === selectedSlot.slotId ||
            request.slotId.includes(selectedSlot.slotId) ||
            selectedSlot.slotId.includes(request.slotId) ||
            // Match last segment of GAM path (e.g., "leaderboard")
            request.slotId.split('/').pop() === selectedSlot.slotId.split('/').pop()
          );

          // Also check if request URL contains the slot identifiers
          const urlMatchesSlot =
            request.url.includes(encodeURIComponent(selectedSlot.slotId)) ||
            request.url.includes(selectedSlot.elementId) ||
            // Check for iu parameter (GAM ad unit)
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

// Set up message listener for background script communication
export function initializeMessageListener() {
  const store = useRequestStore.getState();
  const inspectedTabId = chrome.devtools.inspectedWindow.tabId;

  chrome.runtime.onMessage.addListener((message: MessageType) => {
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
        // Only clear if the navigation is for the tab we're inspecting
        if (message.payload.tabId === inspectedTabId) {
          store.clearRequests();
          store.clearAIState();
        }
        break;

      case 'SLOT_MAPPINGS_UPDATED':
        if (message.payload?.slots) {
          store.setSlotMappings(message.payload.slots);
        }
        break;
    }
  });
}

// Fetch initial requests for current tab
export async function fetchInitialRequests() {
  const tabId = chrome.devtools.inspectedWindow.tabId;

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
export async function fetchInitialSlotMappings() {
  const tabId = chrome.devtools.inspectedWindow.tabId;

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

// Initialize network listener to capture response bodies
// Uses chrome.devtools.network API which provides access to response content
export function initializeNetworkListener() {
  if (!chrome.devtools?.network) {
    console.warn('chrome.devtools.network API not available');
    return;
  }

  chrome.devtools.network.onRequestFinished.addListener((harEntry) => {
    const store = useRequestStore.getState();
    const requestUrl = harEntry.request.url;

    // Find matching request by URL (webRequest and devtools.network use different IDs)
    // Match the most recent uncompleted request with this URL, or the latest completed one
    const matchingRequest = store.requests.find(r =>
      r.url === requestUrl && !r.responsePayload
    );

    if (!matchingRequest) {
      return;
    }

    // Get the response content
    harEntry.getContent((content, encoding) => {
      if (!content || content.length === 0) {
        return;
      }

      // Get content type from response headers
      const contentTypeHeader = harEntry.response.headers.find(
        h => h.name.toLowerCase() === 'content-type'
      );
      const contentType = contentTypeHeader?.value || '';

      // Decode the response body
      let responsePayload: DecodedPayload | undefined;

      try {
        // Handle base64-encoded binary content
        if (encoding === 'base64') {
          try {
            const decoded = atob(content);
            responsePayload = decodeRequestBody(decoded, contentType);
          } catch {
            // If base64 decoding fails, treat as text
            responsePayload = decodeRequestBody(content, contentType);
          }
        } else {
          responsePayload = decodeRequestBody(content, contentType);
        }
      } catch (e) {
        console.warn('Failed to decode response body:', e);
        responsePayload = {
          type: 'text',
          data: content.substring(0, 10000), // Limit size
          raw: content.substring(0, 10000),
        };
      }

      if (responsePayload) {
        store.updateRequest(matchingRequest.id, { responsePayload });
      }
    });
  });
}
