/// <reference lib="WebWorker" />
/// <reference types="vite/client" />

import { cacheRoot, handleFetch } from './caching';
import { handleNotificationClick, handlePush } from './web_push_notifications';

declare const self: ServiceWorkerGlobalScope;

// Cause a new version of a registered Service Worker to replace an existing one
// that is already installed, and replace the currently active worker on open pages.
self.addEventListener('install', (event) => {
  event.waitUntil(cacheRoot());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A new worker installs and then waits quietly (the default, safe behaviour)
// rather than taking over immediately -- that would swap the running app out
// from under someone mid-post. Instead, the page shows an "update ready"
// prompt and only sends this message once the member actually clicks it,
// at which point this worker activates and `clients.claim()` above hands it
// control right away.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

self.addEventListener('fetch', handleFetch);

self.addEventListener('push', handlePush);
self.addEventListener('notificationclick', handleNotificationClick);
