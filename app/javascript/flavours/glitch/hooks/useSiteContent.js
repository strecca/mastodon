import { useState, useEffect, useCallback } from 'react';

import { useIntl } from 'react-intl';

import api from 'flavours/glitch/api';

import { useViewingLocale } from './useViewingLocale';

// Per-locale module-level cache so all components share fetched data
const _cache     = {};  // locale → { key: value }
const _fetchedAt = {};  // locale → ms timestamp
const _loading   = {};  // locale → bool
const _listeners = {};  // locale → Set<setState fn>

const TTL_MS = 30_000;

function getListeners(locale) {
  if (!_listeners[locale]) _listeners[locale] = new Set();
  return _listeners[locale];
}

function notifyListeners(locale) {
  (_listeners[locale] || new Set()).forEach(fn => fn(_cache[locale] || {}));
}

function fetchLocale(locale) {
  if (_loading[locale]) return;
  _loading[locale] = true;
  api()
    .get('/api/v1/site_content', { params: { locale } })
    .then(res => {
      _cache[locale]     = res.data || {};
      _fetchedAt[locale] = Date.now();
      _loading[locale]   = false;
      notifyListeners(locale);
    })
    .catch(() => {
      _cache[locale]     = {};
      _fetchedAt[locale] = Date.now();
      _loading[locale]   = false;
      notifyListeners(locale);
    });
}

/**
 * Returns a getter: sc(key, fallback) → string
 *
 * Automatically uses the viewing locale override (set by the language
 * switcher) — falls back to the account/browser locale when no override
 * is active. Fetches /api/v1/site_content?locale=XX once per locale and
 * caches for 30 s. Re-fetches automatically when the locale changes.
 */
export function useSiteContent() {
  const intl = useIntl();
  const { viewingLocale } = useViewingLocale();

  const locale =
    viewingLocale ||
    (document.documentElement.lang || intl.locale || 'en').split('-')[0];

  const [content, setContent] = useState(_cache[locale] ?? null);

  useEffect(() => {
    // Sync local state immediately when locale changes
    setContent(_cache[locale] ?? null);

    const stale =
      !_cache[locale] ||
      Date.now() - (_fetchedAt[locale] || 0) > TTL_MS;

    if (!stale) return;

    getListeners(locale).add(setContent);
    fetchLocale(locale);

    return () => { getListeners(locale).delete(setContent); };
  }, [locale]);

  return useCallback(
    (key, fallback = '') => content?.[key] ?? _cache[locale]?.[key] ?? fallback,
    [content, locale],
  );
}
