import React, { createContext, useContext } from 'react';
import type { RequestStore } from '@/stores/types';
import type { StoreApi, UseBoundStore } from 'zustand';

// Context for providing the request store to components
type RequestStoreHook = UseBoundStore<StoreApi<RequestStore>>;

const RequestStoreContext = createContext<RequestStoreHook | null>(null);

interface RequestStoreProviderProps {
  store: RequestStoreHook;
  children: React.ReactNode;
}

export function RequestStoreProvider({ store, children }: RequestStoreProviderProps) {
  return (
    <RequestStoreContext.Provider value={store}>
      {children}
    </RequestStoreContext.Provider>
  );
}

// Hook to access the store from components
export function useRequestStoreContext<T>(selector: (state: RequestStore) => T): T {
  const store = useContext(RequestStoreContext);
  if (!store) {
    throw new Error('useRequestStoreContext must be used within a RequestStoreProvider');
  }
  return store(selector);
}

// Hook to get the raw store (for accessing actions)
export function useRequestStore(): RequestStore {
  const store = useContext(RequestStoreContext);
  if (!store) {
    throw new Error('useRequestStore must be used within a RequestStoreProvider');
  }
  return store();
}
