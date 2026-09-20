/// <reference lib="WebWorker" />
/// <reference types="vite/client" />

import { cacheRoot, handleFetch } from "./caching";
import { handleNotificationClick, handlePush } from "./web_push_notifications";

declare const self: ServiceWorkerGlobalScope;

// Stamped at build time (vite.config.mts `define`). Browsers only install a new
// service worker when sw.js differs byte-for-byte from the installed one, and
// sw.js otherwise only changes when service-worker code changes -- so before
// this constant existed, an ordinary deploy never produced an update and
// devices with the app already open (e.g. a phone's home-screen app) stayed on
// stale code indefinitely. Every deploy now changes this literal, so every
// deploy is a new worker and reaches ServiceWorkerUpdateNotice.
// It is referenced in the message handler below so minification keeps it.
const BUILD_ID = __BUILD_ID__;

// Cache the app shell on install. Note this worker does NOT auto-replace an
// already-active one on open pages -- see the 'message' handler below for
// why, and ServiceWorkerUpdateNotice for the user-facing prompt that
// triggers it.
self.addEventListener("install", (event) => {
  event.waitUntil(cacheRoot());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A new worker installs and then waits quietly (the default, safe behaviour)
// rather than taking over immediately -- that would swap the running app out
// from under someone mid-post. Instead, the page shows an "update ready"
// prompt and only sends this message once the member actually clicks it,
// at which point this worker activates and `clients.claim()` above hands it
// control right away.
self.addEventListener("message", (event) => {
  const type = (event.data as { type?: string } | undefined)?.type;

  if (type === "SKIP_WAITING") {
    void self.skipWaiting();
  } else if (type === "GET_BUILD_ID") {
    event.source?.postMessage({ type: "BUILD_ID", buildId: BUILD_ID });
  }
});

self.addEventListener("fetch", handleFetch);

self.addEventListener("push", handlePush);
self.addEventListener("notificationclick", handleNotificationClick);
