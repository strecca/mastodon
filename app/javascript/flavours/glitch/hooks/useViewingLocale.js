import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'viewing_locale';
const CHANGE_EVENT = 'viewing-locale-change';

/**
 * Manages the "viewing language" for community directory content.
 * Independent of the account locale — lets anyone (including someone
 * handed the phone) switch translation display without touching account settings.
 *
 * Persists in localStorage so it survives page navigation within the SPA.
 * When null, falls back to the account locale (intl.locale).
 */
export function useViewingLocale() {
  const [viewingLocale, setViewingLocaleState] = useState(
    () => localStorage.getItem(STORAGE_KEY),
  );

  useEffect(() => {
    const handler = () =>
      setViewingLocaleState(localStorage.getItem(STORAGE_KEY));
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const setViewingLocale = useCallback((locale) => {
    if (locale) {
      localStorage.setItem(STORAGE_KEY, locale);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { viewingLocale, setViewingLocale };
}
