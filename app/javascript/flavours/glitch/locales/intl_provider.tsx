import { useEffect, useState } from 'react';

import { IntlProvider as BaseIntlProvider } from 'react-intl';

import { useViewingLocale } from 'flavours/glitch/hooks/useViewingLocale';
import { isProduction } from 'flavours/glitch/utils/environment';

import type { LocaleData } from './global_locale';
import { getLocale, isLocaleLoaded } from './global_locale';
import { loadLocale, loadLocaleData } from './load_locale';

function onProviderError(error: unknown) {
  // Silent the error, like upstream does
  if (isProduction()) return;

  // This browser does not advertise Intl support for this locale, we only print a warning
  // As-per the spec, the browser should select the best matching locale
  if (
    error &&
    typeof error === 'object' &&
    error instanceof Error &&
    /MISSING_DATA/.exec(error.message)
  ) {
    console.warn(error.message);
  }

  console.error(error);
}

export const IntlProvider: React.FC<
  Omit<React.ComponentProps<typeof BaseIntlProvider>, 'locale' | 'messages'>
> = ({ children, ...props }) => {
  const [localeLoaded, setLocaleLoaded] = useState(false);
  const [baseLocale, setBaseLocale] = useState<LocaleData | null>(null);
  // The "viewing locale" switcher (language_switcher.jsx) lets a visitor
  // override the UI language independently of their account locale. It's
  // stored outside react-intl (localStorage + a window event), so without
  // this, react-intl's own locale/messages stay frozen at whatever was
  // baked into the page on load.
  const { viewingLocale } = useViewingLocale();
  const [viewingLocaleData, setViewingLocaleData] =
    useState<LocaleData | null>(null);

  useEffect(() => {
    async function loadInitialLocale() {
      if (!isLocaleLoaded()) {
        await loadLocale();
      }

      setBaseLocale(getLocale());
      setLocaleLoaded(true);
    }
    void loadInitialLocale();
  }, []);

  useEffect(() => {
    if (!viewingLocale) return;

    let cancelled = false;
    void loadLocaleData(viewingLocale).then((data) => {
      if (!cancelled) setViewingLocaleData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [viewingLocale]);

  if (!localeLoaded || !baseLocale) return null;

  // Only use the fetched viewing-locale data once it actually matches the
  // currently-selected viewingLocale — avoids a stale flash of a previous
  // selection while the new one is still loading.
  const activeLocale =
    viewingLocale && viewingLocaleData?.locale === viewingLocale
      ? viewingLocaleData
      : baseLocale;

  return (
    <BaseIntlProvider
      locale={activeLocale.locale}
      messages={activeLocale.messages}
      onError={onProviderError}
      {...props}
    >
      {children}
    </BaseIntlProvider>
  );
};
