import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './ErrorBoundary';

// Prevent extensions from accessing window.chrome
try {
  Object.defineProperty(window, 'chrome', {
    enumerable: true,
    configurable: false,
    get() {
      return undefined;
    }
  });
} catch (e) {
  console.warn('Failed to override window.chrome:', e);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
); 