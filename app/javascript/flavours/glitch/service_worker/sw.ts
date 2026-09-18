/// <reference lib="WebWorker" />
/// <reference types="vite/client" />

import { cacheRoot, handleFetch } from './caching';
import { handleNotificationClick, handlePush } from './web_push_notifications';

declare const self: ServiceWorkerGlobalScope;

// Cache the app shell on install. Note this worker does NOT auto-replace an
// already-active one on open pages -- see the 'message' handler below for
// why, and ServiceWorkerUpdateNotice for the user-facing prompt that
// triggers it.
self.addEventListener('install', (event) => {
  event.waitUntil(cacheRoot());
});
// Note for testing a future update-ready prompt: a comment-only edit here
// is invisible to the browser's own update-detection byte comparison,
// since comments get stripped by minification -- confirmed 2026-09-18,
// two comment-only "test build" commits never actually changed the
// compiled sw.js at all. Use a real code change (e.g. a temporary
// console.warn in the 'install' handler above) instead, then remove it
// once confirmed.

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
