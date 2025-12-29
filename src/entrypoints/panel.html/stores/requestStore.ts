import { create } from 'zustand';
import type { EnrichedRequest, FilterState, VendorCategory, RequestType, MessageType, IssueType, AIExplanation, AdFlow, DecodedPayload, SlotInfo, SelectedElement, FrameInfo, HeaderBiddingAnalysis } from '@/lib/types';
import { groupRequestsIntoFlows } from '@/lib/adflow';
import * as aiService from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';
import { decodeRequestBody } from '@/lib/decoders';
import { generateHeaderBiddingAnalysis } from '@/lib/headerbidding';

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

  // Element Inspector state
  isPickerActive: boolean;
  inspectedElement: SelectedElement | null;
  frameHierarchy: FrameInfo[];

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

  // Header Bidding Analysis
  headerBiddingAnalysis: HeaderBiddingAnalysis | null;

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
  setInspectedElement: (element: SelectedElement | null) => void;
  resetFilters: () => void;

  // Element Inspector Actions
  startElementPicker: () => Promise<void>;
  stopElementPicker: () => Promise<void>;
  clearInspectedElement: () => void;

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
  getHeaderBiddingAnalysis: () => HeaderBiddingAnalysis | null;
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

  // Header Bidding Analysis
  headerBiddingAnalysis: null,

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

  setSlotMappings: (slots) => {
    set({ slotMappings: slots });
  },

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
    // Get current tab ID
    const tabId = chrome.devtools?.inspectedWindow?.tabId;
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
    const tabId = chrome.devtools?.inspectedWindow?.tabId;
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

    // Also clear the highlight on the page
    const tabId = chrome.devtools?.inspectedWindow?.tabId;
    if (tabId) {
      chrome.runtime.sendMessage({
        type: 'CLEAR_HIGHLIGHT',
        tabId,
      }).catch(() => {});
    }
  },

  clearAllInspectedElements: () => {
    set((state) => ({
      inspectedElement: null,
      filters: { ...state.filters, inspectedElement: undefined },
    }));

    // Clear all highlights on the page (including element picker highlights)
    const tabId = chrome.devtools?.inspectedWindow?.tabId;
    if (tabId) {
      chrome.runtime.sendMessage({
        type: 'CLEAR_ALL_HIGHLIGHTS',
        tabId,
      }).catch(() => {});
    }
  },

  filteredRequests: () => {
    const { requests, filters } = get();
    let placementFilterCount = 0;
    let placementMatchCount = 0;

    const filtered = requests.filter((request) => {
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
        placementFilterCount++;
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
          } else {
            placementMatchCount++;
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
        // If frameId matches, include ALL requests from that frame (not just directUrls)
        const matchesFrameId = relevantFrameIds.has(request.frameId);

        // Helper function to normalize URLs for comparison (remove query, hash, trailing slash)
        const normalizeUrl = (url: string): string => {
          try {
            const urlObj = new URL(url);
            // Remove hash and query for base comparison
            return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.replace(/\/$/, '');
          } catch {
            // If URL parsing fails, try to clean it up manually
            return url.split('?')[0].split('#')[0].replace(/\/$/, '');
          }
        };

        // Helper function to check if two URLs match (handles query params, fragments, protocols)
        const urlsMatch = (url1: string, url2: string): boolean => {
          // Exact match
          if (url1 === url2) return true;
          
          // One contains the other (for partial matches)
          if (url1.includes(url2) || url2.includes(url1)) return true;
          
          try {
            const url1Obj = new URL(url1);
            const url2Obj = new URL(url2);
            
            // Match by hostname and pathname (ignore query, hash, protocol)
            if (url1Obj.hostname === url2Obj.hostname && 
                url1Obj.pathname === url2Obj.pathname) {
                return true;
              }
            
            // Normalized comparison
            if (normalizeUrl(url1) === normalizeUrl(url2)) return true;
            } catch {
            // If one is relative, try to resolve it
            try {
              const baseUrl = window.location.href;
              const resolved1 = new URL(url1, baseUrl);
              const resolved2 = new URL(url2, baseUrl);
              if (resolved1.hostname === resolved2.hostname && 
                  resolved1.pathname === resolved2.pathname) {
                return true;
            }
          } catch {
              // Both failed to parse, fall back to string matching
          }
          }
          
          return false;
        };

        // Match by direct URLs (for img, script, etc.)
        const matchesDirectUrl = element.directUrls.some(url => {
          return urlsMatch(request.url, url);
        });

        // For iframes, also check if the request URL matches the iframe src
        const matchesIframeSrc = element.tagName === 'iframe' && element.src && (() => {
          return urlsMatch(request.url, element.src);
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
            matchesSlotId = !!(request.slotId && (
              request.slotId === slotMapping.slotId ||
              request.slotId.includes(slotMapping.slotId) ||
              slotMapping.slotId.includes(request.slotId) ||
              request.slotId.split('/').pop() === slotMapping.slotId.split('/').pop()
            ));

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

        // Check if the request's elementId matches any slot mapping,
        // and if that slot mapping's elementId could be related to the picked element
        // This handles cases where the picked element is a parent/child of the ad slot
        let matchesRelatedSlot = false;
        if (request.elementId) {
          // Check if the request's elementId matches a slot mapping
          const requestSlotMapping = get().slotMappings.find(s => s.elementId === request.elementId);
          if (requestSlotMapping) {
            // If the picked element has an id, check if it's related to the slot
            if (element.id) {
              // Check if element.id is contained in request.elementId or vice versa
              // (handles cases like "ad-slot" vs "ad-slot-wrapper")
              matchesRelatedSlot = 
                element.id === request.elementId ||
                element.id.includes(request.elementId) ||
                request.elementId.includes(element.id);
              
              // Also check if slot name pattern appears in both IDs
              // Extract slot name from slot mapping elementId (e.g., "fuse-slot-home_vrec_1-1" -> "home_vrec_1_1")
              const slotNameMatch = requestSlotMapping.elementId.match(/[^-]+-(.+)/);
              if (!matchesRelatedSlot && slotNameMatch && slotNameMatch[1]) {
                const slotName = slotNameMatch[1];
                // Check if this slot name appears in the picked element's ID
                matchesRelatedSlot = element.id.includes(slotName) || slotName.includes(element.id.split('_').pop() || '');
              }
            }
            
            // Also match by slotId if we haven't matched yet
            if (!matchesRelatedSlot && request.slotId) {
              matchesRelatedSlot = (
                request.slotId === requestSlotMapping.slotId ||
                request.slotId.includes(requestSlotMapping.slotId) ||
                requestSlotMapping.slotId.includes(request.slotId) ||
                request.slotId.split('/').pop() === requestSlotMapping.slotId.split('/').pop()
              );
              
              // Check URL patterns
              if (!matchesRelatedSlot) {
                matchesRelatedSlot = 
                  request.url.includes(encodeURIComponent(requestSlotMapping.slotId)) ||
                  request.url.includes(requestSlotMapping.elementId) ||
                  request.url.includes(`iu=${encodeURIComponent(requestSlotMapping.slotId)}`) ||
                  request.url.includes(`iu=${requestSlotMapping.slotId.replace(/\//g, '%2F')}`);
              }
            }
            
            // If request is in the same frame as the picked element and matches a slot mapping,
            // consider it a match (the picked element is likely a container for this slot)
            if (!matchesRelatedSlot && matchesFrameId) {
              matchesRelatedSlot = true;
            }
          }
        }
        
        // Also check if request.slotId matches any slot mapping, and if that slot could be related
        if (!matchesRelatedSlot && request.slotId) {
          const requestSlotId = request.slotId;
          // Find slot mappings that match this request's slotId
          const matchingSlotMappings = get().slotMappings.filter(s => 
            s.slotId === requestSlotId ||
            requestSlotId.includes(s.slotId) ||
            s.slotId.includes(requestSlotId) ||
            requestSlotId.split('/').pop() === s.slotId.split('/').pop()
          );
          
          for (const mapping of matchingSlotMappings) {
            // If the picked element is in the same frame, and the request matches a slot mapping,
            // it's likely related (picked element is container/wrapper for the slot)
            if (matchesFrameId) {
              matchesRelatedSlot = true;
              break;
            }
            
            // Also check if slot name pattern matches
            if (element.id && mapping.elementId) {
              const slotNameMatch = mapping.elementId.match(/[^-]+-(.+)/);
              if (slotNameMatch && slotNameMatch[1]) {
                const slotName = slotNameMatch[1];
                if (element.id.includes(slotName) || slotName.includes(element.id.split('_').pop() || '')) {
                  matchesRelatedSlot = true;
                  break;
                }
              }
            }
          }
        }


        // If frameId matches AND (request matches a slot OR matches directUrls), include it
        // Otherwise, check other matching criteria
        // Don't include ALL frame requests - only those that match slots or direct URLs
        const finalMatch = matchesDirectUrl || matchesIframeSrc || matchesElementId || matchesSlotId || matchesRelatedSlot || (matchesFrameId && (matchesRelatedSlot || matchesSlotId || matchesElementId));
        
        if (!finalMatch) {
          return false;
        }
      }

      return true;
    });
    
    return filtered;
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

  getHeaderBiddingAnalysis: () => {
    const { filteredRequests } = get();
    const requests = filteredRequests();
    const flows = groupRequestsIntoFlows(requests);
    
    if (requests.length === 0) {
      return null;
    }

    try {
      return generateHeaderBiddingAnalysis(requests, flows);
    } catch (error) {
      throw error;
    }
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
  // Get tabId dynamically each time instead of caching it
  // This ensures we always compare against the CURRENT inspected tab
  const getCurrentTabId = () => chrome.devtools.inspectedWindow.tabId;

  chrome.runtime.onMessage.addListener((message: MessageType) => {
    const inspectedTabId = getCurrentTabId();

    // Filter messages by tabId for tab-specific messages
    // Skip tab filtering for messages without payload or tabId
    if (message.type !== 'CLEAR_REQUESTS' && 'payload' in message && message.payload && typeof message.payload === 'object' && 'tabId' in message.payload && message.payload.tabId !== undefined && message.payload.tabId !== inspectedTabId) {
      // Message is for a different tab, ignore it
        return;
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
        useRequestStore.setState({ isPickerActive: false });
        break;

      case 'CLEAR_INSPECTED_ELEMENT':
        store.clearInspectedElement();
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

// Reinitialize data for a new/changed tab
export async function reinitializeForCurrentTab() {
  const store = useRequestStore.getState();
  store.clearRequests();
  store.clearAIState();
  await Promise.all([
    fetchInitialRequests(),
    fetchInitialSlotMappings(),
  ]);
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
