import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { captureError } from './lib/errorMonitoring';
import App from './App';
import './index.css';

// Global capture for errors React cannot reach. Reports are PHI-excluded and
// are sent nowhere until a monitoring destination is configured.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    captureError(event.error || new Error(event.message || 'Script error'), {
      route: window.location.pathname,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    captureError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason ?? 'Unhandled rejection')),
      { route: window.location.pathname },
    );
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
