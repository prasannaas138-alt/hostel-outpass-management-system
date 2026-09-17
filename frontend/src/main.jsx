import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);

/* PWA service worker (production only): guarantees the INSTALLED app always
   runs the current bundle — network-first shell, versioned asset cache, and
   the API is never intercepted. On plain-HTTP origins (e.g. LAN IPs) service
   workers are unsupported by the browser, so this silently does nothing and
   the app keeps working exactly as before. */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW unsupported (e.g. plain HTTP) — online-only mode, no behavior change. */
    });
  });
}
