import { useCallback, useMemo, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import { Icon } from 'flavours/glitch/components/icon';

const DISMISSED_KEY = 'install_app_banner_dismissed';

const messages = defineMessages({
  ios: {
    id: 'install_app_banner.ios',
    defaultMessage:
      'Add MiaCivezza to your Home Screen: tap Share, then "Add to Home Screen".',
  },
  firefoxAndroid: {
    id: 'install_app_banner.firefox_android',
    defaultMessage:
      'Add MiaCivezza to your Home Screen: open the menu, then look for "Install" or "Add to Home Screen".',
  },
  inAppBrowser: {
    id: 'install_app_banner.in_app_browser',
    defaultMessage:
      'To add MiaCivezza to your Home Screen, open this page in your browser first (tap the menu, then "Open in Browser").',
  },
  dismiss: {
    id: 'install_app_banner.dismiss',
    defaultMessage: 'Dismiss',
  },
});

type InstallHint = 'ios' | 'firefox-android' | 'in-app-browser';

// Only the browser matters here, not the device model or OS version --
// detection is entirely about which install path (if any) applies.
function detectInstallHint(): InstallHint | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  // Already installed (running from the home-screen icon) -- nothing to
  // prompt. `standalone` is Safari's own non-standard property; the media
  // query covers every other browser that supports installable PWAs.
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isStandalone) {
    return null;
  }

  const ua = navigator.userAgent;

  // In-app browsers (WhatsApp, Facebook, Instagram) can't install a PWA at
  // all, regardless of the underlying engine -- there's no real browser
  // chrome to install from. Checked first: e.g. Facebook's in-app browser
  // on iOS would otherwise match the iOS case below and show instructions
  // that don't exist in that context.
  if (/FBAN|FBAV|Instagram|WhatsApp|Line\//.test(ua)) {
    return 'in-app-browser';
  }

  // iOS: every browser is required to use WebKit, so Safari and Firefox
  // behave identically here -- both need the manual Share -> Add to Home
  // Screen flow, and neither auto-prompts. No need to distinguish browser.
  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'ios';
  }

  // Android: Chrome, Samsung Internet, and other Chromium browsers already
  // show their own automatic install prompt (the beforeinstallprompt
  // event) -- only Firefox lacks that and needs a manual nudge.
  if (ua.includes('Android') && ua.includes('Firefox')) {
    return 'firefox-android';
  }

  return null;
}

export const InstallAppBanner: React.FC = () => {
  const intl = useIntl();
  const [dismissed, setDismissed] = useState(
    () => window.localStorage.getItem(DISMISSED_KEY) === 'true',
  );
  const hint = useMemo(() => detectInstallHint(), []);

  const handleDismiss = useCallback(() => {
    window.localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }, []);

  if (!hint || dismissed) {
    return null;
  }

  const message =
    hint === 'ios'
      ? messages.ios
      : hint === 'firefox-android'
        ? messages.firefoxAndroid
        : messages.inAppBrowser;

  return (
    <div className='install-app-banner'>
      <span className='install-app-banner__text'>
        {intl.formatMessage(message)}
      </span>
      <button
        type='button'
        className='install-app-banner__dismiss'
        onClick={handleDismiss}
        aria-label={intl.formatMessage(messages.dismiss)}
      >
        <Icon id='' icon={CloseIcon} />
      </button>
    </div>
  );
};
