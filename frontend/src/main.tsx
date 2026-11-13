import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';
import './i18n';

/**
 * File: C:\iTweet\frontend\src\main.tsx
 * Callers: Browser entrypoint.
 * Purpose: Mount React app with QueryClient, BrowserRouter, Toaster, and i18n initialization.
 * Instruction: "Implement extensible internationalization system supporting international users and users across India ... Total initial target: 23 language options."
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--rule)',
              fontFamily: 'var(--display)',
              fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
