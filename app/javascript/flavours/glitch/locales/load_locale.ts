import { Semaphore } from 'async-mutex';

import type { LocaleData } from './global_locale';
import { isLocaleLoaded, setLocale } from './global_locale';

const localeLoadingSemaphore = new Semaphore(1);

const upstreamLocaleFiles = import.meta.glob<{
  default: LocaleData['messages'];
}>(['@/mastodon/locales/*.json']);
const localeFiles = import.meta.glob<{ default: LocaleData['messages'] }>([
  './*.json',
]);

// Cache of in-flight/completed loads, keyed by locale code, so switching
// back and forth between locales (e.g. via the community viewing-locale
// switcher) doesn't re-fetch the same JSON bundles every time.
const localeDataCache = new Map<string, Promise<LocaleData>>();

export function loadLocaleData(locale: string): Promise<LocaleData> {
  const cached = localeDataCache.get(locale);
  if (cached) return cached;

  const promise = (async (): Promise<LocaleData> => {
    // If there is no locale file, then fallback to english
    const upstreamLocaleFile = Object.hasOwn(
      upstreamLocaleFiles,
      `/mastodon/locales/${locale}.json`,
    )
      ? upstreamLocaleFiles[`/mastodon/locales/${locale}.json`]
      : upstreamLocaleFiles['/mastodon/locales/en.json'];

    if (!upstreamLocaleFile)
      throw new Error('Could not load the upstream locale JSON file');

    const { default: upstreamLocaleData } = await upstreamLocaleFile();

    // If there is no locale file, then fallback to english
    const localeFile = Object.hasOwn(localeFiles, `./${locale}.json`)
      ? localeFiles[`./${locale}.json`]
      : localeFiles['./en.json'];

    if (!localeFile) throw new Error('Could not load the locale JSON file');

    const { default: localeData } = await localeFile();

    return { messages: { ...upstreamLocaleData, ...localeData }, locale };
  })();

  localeDataCache.set(locale, promise);
  return promise;
}

export async function loadLocale() {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- we want to match empty strings
  const locale = document.querySelector<HTMLElement>('html')?.lang || 'en';

  // We use a Semaphore here so only one thing can try to load the locales at
  // the same time. If one tries to do it while its in progress, it will wait
  // for the initial load to finish before it is resumed (and will see that locale
  // data is already loaded)
  await localeLoadingSemaphore.runExclusive(async () => {
    // if the locale is already set, then do nothing
    if (isLocaleLoaded()) return;

    setLocale(await loadLocaleData(locale));
  });
}
