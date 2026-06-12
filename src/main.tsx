// ⚡ Self-cleaning routine to prevent stale Service Worker caches from showing blank pages/crashing after new publishes
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

if ('caches' in window) {
  caches.keys().then((keyList) => {
    Promise.all(
      keyList.map((key) => {
        return caches.delete(key);
      })
    ).then((results) => {
      if (results.some(Boolean)) {
        console.log('Legacy caches detected and cleared. Performing live update...');
        window.location.reload();
      }
    });
  }).catch((err) => {
    console.warn('Cache clear error:', err);
  });
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

