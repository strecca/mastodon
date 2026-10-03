/// <reference lib="WebWorker" />
/// <reference types="vite/client" />

import { DAY } from "../utils/time";

const CACHE_NAME_PREFIX = "mastodon-";
const CACHE_HEADER_TTL = "x-timestamp";

// Explicit allowlist, not a broad /community_*/ pattern -- deliberately
// opt-in. These are the public, browse-oriented GET endpoints for our own
// Community features (events, listings, member stories, the daily digest,
// newsletters, the front-door category board), which benefit from an
// instant cached response while quietly refreshing in the background.
// Everything else under community_*/civezza_* (admin tooling under
// community_directory/*, moderation, maintenance, notification
// preferences, My People) is deliberately NOT here -- those need to always
// reflect the real current state, not a cached one, even briefly stale.
const COMMUNITY_SWR_PATHS = [
  "/api/v1/community_events",
  "/api/v1/community_listings",
  "/api/v1/community_restaurants",
  "/api/v1/community_properties",
  "/api/v1/community_services",
  "/api/v1/community_artists",
  "/api/v1/community_visits",
  "/api/v1/civezza_member_stories",
  "/api/v1/community_daily_digests",
  "/api/v1/community_newsletters",
  "/api/v1/community_quick_shares",
  "/api/v1/community_landing",
];

export async function cacheRoot() {
  const cache = await openWebCache();
  const response = await fetch("/", {
    credentials: "include",
    redirect: "manual",
  });
  await cache.put("/", response);
}

export function handleFetch(event: FetchEvent) {
  const url = new URL(event.request.url);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  if (url.pathname === "/auth/sign_out") {
    event.respondWith(handleLogout(event));
  } else if (/intl\/.*\.js$/.test(url.pathname)) {
    event.respondWith(cacheFirst({ event, name: "locales" }));
  } else if (event.request.destination === "font") {
    event.respondWith(cacheFirst({ event, name: "fonts" }));
  } else if (event.request.destination === "image") {
    event.respondWith(cacheFirst({ event, name: "images", ttl: DAY * 7 }));
  } else if (
    event.request.method === "GET" &&
    COMMUNITY_SWR_PATHS.some((path) => url.pathname.startsWith(path))
  ) {
    event.respondWith(staleWhileRevalidate({ event, name: "community-api" }));
  }
}

async function cacheFirst({
  event,
  name,
  ttl = DAY * 30,
  max = 5,
}: {
  event: FetchEvent;
  name: string;
  ttl?: number;
  max?: number;
}) {
  const cache = await caches.open(`${CACHE_NAME_PREFIX}${name}`);
  const request = event.request;
  const cachedResponse = await cache.match(request);

  // Start expiring cache items while the process continues.
  void expireCachedItems({ name, ttl, max });

  if (cachedResponse) {
    // If we have a cached response, check the TTL header.
    const ttlHeader = Number.parseInt(cachedResponse.headers.get(CACHE_HEADER_TTL) ?? "0");

    if (!ttlHeader || ttlHeader + ttl > Date.now()) {
      return cachedResponse;
    }
  }

  const networkResponse = await fetch(request);

  // For opaque responses, the status will be zero so we can't clone them.
  if (networkResponse.status !== 0) {
    // Clone request with a custom header to store timestamp.
    const cloneHeaders = new Headers(networkResponse.headers);
    cloneHeaders.set(CACHE_HEADER_TTL, Date.now().toString());

    const cloneResponse = new Response(networkResponse.clone().body, {
      headers: cloneHeaders,
      status: networkResponse.status,
      statusText: networkResponse.statusText,
    });

    await cache.put(request, cloneResponse);
  }

  return networkResponse;
}

// Unlike cacheFirst, this always serves whatever is cached immediately
// (even if old) rather than checking a TTL first -- freshness comes from
// the background refetch below, not from gating on an age check. Single
// fetch() call either way: when nothing is cached yet it is awaited
// directly (first visit has to wait for the network regardless); when
// something is cached it is handed to event.waitUntil() so the worker
// stays alive long enough to actually persist the refreshed response,
// independent of the cached response already returned to the page.
async function staleWhileRevalidate({
  event,
  name,
  ttl = DAY * 3,
  max = 60,
}: {
  event: FetchEvent;
  name: string;
  ttl?: number;
  max?: number;
}) {
  const cache = await caches.open(`${CACHE_NAME_PREFIX}${name}`);
  const request = event.request;
  const cachedResponse = await cache.match(request);

  void expireCachedItems({ name, ttl, max });

  const networkFetch = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      // Same x-timestamp header cacheFirst stamps, kept consistent so
      // expireCachedItems' max-count trimming evicts the actual oldest
      // fetch first instead of falling back to arbitrary ordering for
      // entries with no timestamp.
      const cloneHeaders = new Headers(networkResponse.headers);
      cloneHeaders.set(CACHE_HEADER_TTL, Date.now().toString());

      const cloneResponse = new Response(networkResponse.clone().body, {
        headers: cloneHeaders,
        status: networkResponse.status,
        statusText: networkResponse.statusText,
      });

      void cache.put(request, cloneResponse);
    }

    return networkResponse;
  });

  if (cachedResponse) {
    event.waitUntil(networkFetch.catch(() => undefined));
    return cachedResponse;
  }

  return networkFetch;
}

export async function expireCachedItems({
  name,
  ttl = DAY * 30,
  max = 5,
}: {
  name: string;
  ttl?: number;
  max?: number;
}) {
  const cache = await caches.open(`${CACHE_NAME_PREFIX}${name}`);

  const keys = await cache.keys();
  const now = Date.now();
  const validKeys: { key: Request; timestamp: number }[] = [];

  for (const key of keys) {
    const cachedResponse = await cache.match(key);

    if (!cachedResponse) {
      await cache.delete(key);
      continue;
    }

    const timestamp = Number.parseInt(cachedResponse.headers.get(CACHE_HEADER_TTL) ?? "0");

    if (!timestamp || timestamp + ttl > now) {
      validKeys.push({ key, timestamp: timestamp || Number.POSITIVE_INFINITY });
      continue;
    }

    await cache.delete(key);
  }

  if (validKeys.length <= max) {
    return;
  }

  const sortedValidKeys = validKeys.toSorted(({ timestamp: a }, { timestamp: b }) => a - b);
  await Promise.all(
    sortedValidKeys.slice(0, sortedValidKeys.length - max).map(({ key }) => cache.delete(key)),
  );
}

function openWebCache() {
  return caches.open(`${CACHE_NAME_PREFIX}web`);
}

async function handleLogout(event: FetchEvent) {
  const response = await fetch(event.request);

  if (response.ok || response.type === "opaqueredirect") {
    const cache = await openWebCache();
    await cache.delete("/");
  }

  return response;
}
