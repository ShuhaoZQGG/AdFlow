import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { RequestStoreProvider } from '@/contexts/RequestStoreContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useRequestStore } from './stores/requestStore';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RequestStoreProvider store={useRequestStore}>
        <App />
      </RequestStoreProvider>
    </ThemeProvider>
  </React.StrictMode>
);
