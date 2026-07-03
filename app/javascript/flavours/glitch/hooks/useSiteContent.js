import { useState, useEffect, useCallback } from 'react';

import api from 'flavours/glitch/api';

let _cache = null;
let _loading = false;
let _fetchedAt = 0;
let _listeners = new Set();

const TTL_MS = 30_000; // re-fetch after 30 s — fast enough to see admin changes without constant polling

function notifyListeners() {
  _listeners.forEach(fn => fn(_cache));
}

/**
 * Returns a getter function: get(key, fallback) → string
 *
 * Fetches /api/v1/site_content once and caches for 30 seconds.
 * All components share the cache; navigating back to a page after 30 s
 * picks up any admin changes without a full browser reload.
 *
 * Usage:
 *   const sc = useSiteContent();
 *   return <h1>{sc('landing_logo_text', 'Civezza Community Directory')}</h1>;
 */
export function useSiteContent() {
  const [content, setContent] = useState(_cache);

  useEffect(() => {
    const stale = !_cache || (Date.now() - _fetchedAt) > TTL_MS;

    if (!stale) {
      if (content !== _cache) setContent(_cache);
      return;
    }

    _listeners.add(setContent);

    if (!_loading) {
      _loading = true;
      const locale = (document.documentElement.lang || 'en').split('-')[0];
      api().get('/api/v1/site_content', { params: { locale } })
        .then(res => {
          _cache    = res.data || {};
          _fetchedAt = Date.now();
          _loading  = false;
          notifyListeners();
        })
        .catch(() => {
          _cache    = {};
          _fetchedAt = Date.now();
          _loading  = false;
          notifyListeners();
        });
    }

    return () => { _listeners.delete(setContent); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return useCallback(
    (key, fallback = '') => content?.[key] ?? fallback,
    [content],
  );
}
