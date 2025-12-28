// Vendor categories for adtech ecosystem
export type VendorCategory =
  | 'SSP'
  | 'DSP'
  | 'Verification'
  | 'Measurement'
  | 'CDN'
  | 'AdServer'
  | 'Prebid'
  | 'Identity'
  | 'Native'
  | 'Other';

// Request types commonly seen in adtech
export type RequestType =
  | 'bid_request'
  | 'bid_response'
  | 'impression'
  | 'click'
  | 'viewability'
  | 'sync'
  | 'creative'
  | 'config'
  | 'unknown';

// Ad Flow Stages - represents the typical sequence of ad serving
export type AdFlowStage =
  | 'prebid_auction'      // Prebid.js auction initiation
  | 'bid_request'         // SSP/Exchange bid requests
  | 'bid_response'        // Bid responses received
  | 'ad_server'           // Ad server call (e.g., GAM)
  | 'creative_render'     // Creative/ad content loading
  | 'impression'          // Impression tracking pixels
  | 'viewability'         // Viewability measurement
  | 'verification'        // Ad verification (IAS, DV, MOAT)
  | 'click'               // Click tracking
  | 'identity_sync'       // Cookie/ID syncing
  | 'other';              // Uncategorized

// Vendor definition
export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  patterns: string[];
  requestTypes?: Record<string, {
    pattern: string;
    decoder?: string;
  }>;
  logo?: string;
  documentation?: string;
}

// Decoded payload structure
export interface DecodedPayload {
  type: 'json' | 'urlParams' | 'base64' | 'openrtb' | 'text' | 'unknown';
  data: Record<string, unknown> | string;
  raw: string;
}

// Enriched request with vendor info
export interface EnrichedRequest {
  id: string;
  url: string;
  method: string;
  type: chrome.webRequest.ResourceType;
  tabId: number;
  frameId: number; // Frame ID from webRequest API (0 = main frame)
  timestamp: number;
  startTime: number; // ms since page load
  duration?: number;
  statusCode?: number;

  // Request details
  requestHeaders?: chrome.webRequest.HttpHeader[];
  requestBody?: DecodedPayload;

  // Response details
  responseHeaders?: chrome.webRequest.HttpHeader[];
  responseSize?: number;
  responsePayload?: DecodedPayload;

  // Vendor enrichment
  vendor?: Vendor;
  vendorRequestType?: RequestType;

  // Ad flow grouping
  adFlowStage?: AdFlowStage;
  adFlowId?: string;          // ID of the ad flow this request belongs to
  slotId?: string;            // Detected ad slot identifier
  elementId?: string;         // DOM element ID for this ad slot (from GAM/Prebid)

  // Decoded payload
  decodedPayload?: DecodedPayload;

  // Status
  error?: string;
  completed: boolean;

  // Detected issues
  issues?: Issue[];
}

// Filter state for the UI
export interface FilterState {
  vendors: string[];
  categories: VendorCategory[];
  requestTypes: RequestType[];
  statusCodes: ('2xx' | '3xx' | '4xx' | '5xx' | 'error')[];
  issueTypes: IssueType[];
  searchQuery: string;
  showOnlyIssues: boolean;
  placementFilter?: string;   // Filter by ad placement/slot elementId
  inspectedElement?: SelectedElement; // Filter by inspected DOM element
}

// Slot info from GAM/Prebid
export interface SlotInfo {
  elementId: string;
  slotId: string;
  type: 'gam' | 'prebid';
  sizes?: string[];
}

// Element Inspector types
export interface SelectedElement {
  tagName: string;
  id?: string;
  className?: string;
  src?: string;
  href?: string;
  innerText?: string; // First 100 chars for context
  frameId: number; // frameId of the frame containing this element (0 = main frame)
  childFrameIds: number[]; // frameIds of child iframes within this element
  directUrls: string[]; // URLs directly associated (img src, script src, etc.)
  rect: { top: number; left: number; width: number; height: number };
  documentUrl?: string; // URL of the document containing this element (for frame resolution)
}

export interface FrameInfo {
  frameId: number;
  parentFrameId: number;
  url: string;
}

// Message types for background <-> devtools communication
export type MessageType =
  | { type: 'REQUEST_START'; payload: EnrichedRequest }
  | { type: 'REQUEST_COMPLETE'; payload: { id: string; statusCode: number; duration: number; responseHeaders?: chrome.webRequest.HttpHeader[]; issues?: Issue[] } }
  | { type: 'REQUEST_ERROR'; payload: { id: string; error: string; issues?: Issue[] } }
  | { type: 'ISSUES_DETECTED'; payload: { requestId: string; issues: Issue[] } }
  | { type: 'CLEAR_REQUESTS' }
  | { type: 'PAGE_NAVIGATED'; payload: { tabId: number; url: string } }
  | { type: 'GET_REQUESTS'; tabId: number }
  | { type: 'REQUESTS_DATA'; payload: EnrichedRequest[] }
  | { type: 'SLOT_MAPPINGS_UPDATED'; payload: { slots: SlotInfo[]; timestamp: number } }
  | { type: 'GET_SLOT_MAPPINGS'; tabId: number }
  | { type: 'SLOT_MAPPINGS_DATA'; payload: { slots: SlotInfo[] } }
  // Element Inspector messages
  | { type: 'START_ELEMENT_PICKER'; tabId: number }
  | { type: 'STOP_ELEMENT_PICKER'; tabId: number }
  | { type: 'ELEMENT_PICKER_STARTED' }
  | { type: 'ELEMENT_PICKER_STOPPED' }
  | { type: 'ELEMENT_SELECTED'; payload: { element: SelectedElement; tabId: number } }
  | { type: 'GET_FRAME_HIERARCHY'; tabId: number }
  | { type: 'FRAME_HIERARCHY_DATA'; payload: { frames: FrameInfo[]; tabId: number } }
  | { type: 'CLEAR_INSPECTED_ELEMENT' };

// Category color mapping
export const CATEGORY_COLORS: Record<VendorCategory, string> = {
  SSP: '#3B82F6',
  DSP: '#8B5CF6',
  Verification: '#F59E0B',
  Measurement: '#10B981',
  CDN: '#6B7280',
  AdServer: '#EF4444',
  Prebid: '#EC4899',
  Identity: '#06B6D4',
  Native: '#F97316',
  Other: '#9CA3AF',
};

// Issue types for problem detection
export type IssueType =
  | 'timeout'
  | 'failed'
  | 'duplicate_pixel'
  | 'out_of_order'
  | 'slow_response';

export type IssueSeverity = 'warning' | 'error';

export interface Issue {
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  details?: string;
  relatedRequestIds?: string[];
}

export const ISSUE_COLORS: Record<IssueSeverity, string> = {
  warning: '#F59E0B',
  error: '#EF4444',
};

export const ISSUE_LABELS: Record<IssueType, string> = {
  timeout: 'Timeout',
  failed: 'Failed',
  duplicate_pixel: 'Duplicate',
  out_of_order: 'Out of Order',
  slow_response: 'Slow',
};

// Ad Flow - a group of related requests forming an ad serving chain
export interface AdFlow {
  id: string;
  slotId?: string;           // Ad slot identifier if detected
  adUnitPath?: string;       // GAM ad unit path if available
  startTime: number;
  endTime?: number;
  requests: EnrichedRequest[];
  stages: Map<AdFlowStage, EnrichedRequest[]>;
  winningBid?: {
    vendor: string;
    price?: number;
    currency?: string;
  };
  issues: Issue[];
}

// Stage metadata for UI display
export const AD_FLOW_STAGE_META: Record<AdFlowStage, { label: string; color: string; order: number }> = {
  prebid_auction: { label: 'Prebid Auction', color: '#EC4899', order: 1 },
  bid_request: { label: 'Bid Requests', color: '#3B82F6', order: 2 },
  bid_response: { label: 'Bid Response', color: '#8B5CF6', order: 3 },
  ad_server: { label: 'Ad Server', color: '#EF4444', order: 4 },
  creative_render: { label: 'Creative', color: '#F97316', order: 5 },
  impression: { label: 'Impression', color: '#10B981', order: 6 },
  viewability: { label: 'Viewability', color: '#F59E0B', order: 7 },
  verification: { label: 'Verification', color: '#6366F1', order: 8 },
  click: { label: 'Click', color: '#14B8A6', order: 9 },
  identity_sync: { label: 'ID Sync', color: '#06B6D4', order: 10 },
  other: { label: 'Other', color: '#9CA3AF', order: 99 },
};

// AI Analysis Types

export interface AIExplanation {
  requestId: string;
  explanation: string;
  timestamp: number;
}

// AI responses are stored as raw markdown text
export type SessionSummary = string;
export type DiscrepancyPredictions = string;

export interface AIState {
  explanations: Record<string, AIExplanation>;
  sessionSummary: SessionSummary | null;
  discrepancyPredictions: DiscrepancyPredictions | null;
  orderingAnalysis: string | null;
  isAnalyzing: boolean;
  aiError: string | null;
}
