import { create } from 'zustand';
import type { EnrichedRequest, MessageType, SlotInfo } from '@/lib/types';

interface PopupStore {
  requests: EnrichedRequest[];
  selectedRequest: EnrichedRequest | null;
  slotMappings: SlotInfo[];
  tabId: number | null;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setTabId: (tabId: number) => void;
  addRequest: (request: EnrichedRequest) => void;
  updateRequest: (id: string, updates: Partial<EnrichedRequest>) => void;
  setRequests: (requests: EnrichedRequest[]) => void;
  selectRequest: (request: EnrichedRequest | null) => void;
  clearRequests: () => void;
  setSlotMappings: (slots: SlotInfo[]) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePopupStore = create<PopupStore>((set, get) => ({
  requests: [],
  selectedRequest: null,
  slotMappings: [],
  tabId: null,
  isInitialized: false,
  error: null,

  setTabId: (tabId) => set({ tabId }),

  addRequest: (request) =>
    set((state) => {
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

  setInitialized: (initialized) => set({ isInitialized: initialized }),

  setError: (error) => set({ error }),
}));

// Initialize message listener for popup (uses tabId from store)
export function initializePopupMessageListener() {
  const store = usePopupStore.getState();

  chrome.runtime.onMessage.addListener((message: MessageType) => {
    const currentTabId = usePopupStore.getState().tabId;

    // Filter messages by tabId
    if (message.payload?.tabId !== undefined && message.payload.tabId !== currentTabId) {
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
        break;

      case 'PAGE_NAVIGATED':
        store.clearRequests();
        break;

      case 'SLOT_MAPPINGS_UPDATED':
        if (message.payload?.slots) {
          store.setSlotMappings(message.payload.slots);
        }
        break;
    }
  });
}

// Fetch initial requests for current tab (popup version)
export async function fetchPopupInitialRequests(tabId: number) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_REQUESTS',
      tabId,
    });

    if (response?.type === 'REQUESTS_DATA') {
      usePopupStore.getState().setRequests(response.payload);
    }
  } catch (e) {
    console.error('Failed to fetch initial requests:', e);
    usePopupStore.getState().setError('Failed to fetch requests');
  }
}

// Fetch initial slot mappings (popup version)
export async function fetchPopupInitialSlotMappings(tabId: number) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SLOT_MAPPINGS',
      tabId,
    });

    if (response?.type === 'SLOT_MAPPINGS_DATA' && response.payload?.slots) {
      usePopupStore.getState().setSlotMappings(response.payload.slots);
    }
  } catch (e) {
    console.error('Failed to fetch initial slot mappings:', e);
  }
}

// Initialize popup with current tab
export async function initializePopup() {
  const store = usePopupStore.getState();

  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      store.setError('No active tab found');
      store.setInitialized(true);
      return;
    }

    // Check if it's a chrome:// URL
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
      store.setError('Cannot monitor Chrome internal pages');
      store.setInitialized(true);
      return;
    }

    store.setTabId(tab.id);

    // Set up message listener
    initializePopupMessageListener();

    // Fetch initial data
    await Promise.all([
      fetchPopupInitialRequests(tab.id),
      fetchPopupInitialSlotMappings(tab.id),
    ]);

    store.setInitialized(true);
  } catch (e) {
    console.error('Failed to initialize popup:', e);
    store.setError('Failed to initialize');
    store.setInitialized(true);
  }
}
