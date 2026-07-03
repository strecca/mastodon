import { useState, useEffect, useCallback } from 'react';

import api from 'flavours/glitch/api';

// Module-level cache — shared across all hook instances, fetched once per page load
let _cache = null;
let _loading = false;
let _listeners = new Set();

function notifyListeners() {
  _listeners.forEach(fn => fn(_cache));
}

/**
 * Returns a getter function: get(key, fallback) → string
 *
 * Content is fetched once from /api/v1/site_content and cached for the session.
 * All components using this hook share the same cache and update together on load.
 *
 * Usage:
 *   const sc = useSiteContent();
 *   return <h1>{sc('landing_logo_text', 'Civezza Community Directory')}</h1>;
 */
export function useSiteContent() {
  const [content, setContent] = useState(_cache);

  useEffect(() => {
    if (_cache !== null) return;  // already loaded

    _listeners.add(setContent);

    if (!_loading) {
      _loading = true;
      // Pass browser locale so server can return appropriate translations
      const locale = (document.documentElement.lang || 'en').split('-')[0];
      api().get('/api/v1/site_content', { params: { locale } })
        .then(res => {
          _cache = res.data || {};
          notifyListeners();
        })
        .catch(() => {
          _cache = {};
          notifyListeners();
        });
    }

    return () => { _listeners.delete(setContent); };
  }, []);

  return useCallback(
    (key, fallback = '') => content?.[key] ?? fallback,
    [content],
  );
}
