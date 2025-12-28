// Shared store types for both panel and sidepanel
import type { EnrichedRequest, FilterState, VendorCategory, RequestType, IssueType, AIExplanation, AdFlow, SlotInfo, SelectedElement, FrameInfo } from '@/lib/types';
import type { ChatMessage } from '@/lib/ai';

export interface RequestStore {
  requests: EnrichedRequest[];
  selectedRequest: EnrichedRequest | null;
  filters: FilterState;
  slotMappings: SlotInfo[];

  // Element Inspector state
  isPickerActive: boolean;
  inspectedElement: SelectedElement | null;
  frameHierarchy: FrameInfo[];

  // AI State
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
}
