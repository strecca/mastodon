import { useCallback, useEffect, useRef, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { Alert } from 'flavours/glitch/components/alert';
import { useInterval } from 'flavours/glitch/hooks/useInterval';

// Browsers only check for a new service worker on a fresh page navigation,
// or when explicitly told to via registration.update() -- they do NOT
// proactively re-check while a tab just sits open and idle. Without this,
// someone browsing for a while (exactly the case this feature is for) would
// never see an update prompt no matter how long they waited, since nothing
// would ever prompt the browser to go look.
const UPDATE_CHECK_INTERVAL = 60_000;

const messages = defineMessages({
  title: {
    id: 'service_worker_update_notice.title',
    defaultMessage: 'Update ready',
  },
  message: {
    id: 'service_worker_update_notice.message',
    defaultMessage:
      "A newer, improved version of MiaCivezza.com is ready for you. You'll be back to browsing and posting in under a minute.",
  },
  action: {
    id: 'service_worker_update_notice.action',
    defaultMessage: 'Update now',
  },
});

/**
 * Detects when a new service worker has installed and is waiting to take
 * over (i.e. a real update to an already-open session, not the very first
 * visit), and shows a prompt so the member can choose when to apply it --
 * never silently, since that could interrupt someone mid-post. The new
 * worker only activates once they click "Update now"; see sw.ts's
 * `message` handler for the other half of this.
 */
export const ServiceWorkerUpdateNotice: React.FC = () => {
  const intl = useIntl();
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [updating, setUpdating] = useState(false);
  const hasReloaded = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleUpdateFound = (registration: ServiceWorkerRegistration) => {
      const newWorker = registration.installing;
      if (!newWorker) {
        return;
      }

      newWorker.addEventListener('statechange', () => {
        // 'installed' with registration.active already populated means an
        // older worker was already running -- a genuine update, not the
        // very first install on a fresh visit (which also passes through
        // 'installed' but has no prior active worker to replace).
        //
        // Deliberately checking registration.active here, not
        // navigator.serviceWorker.controller: a page can have a fully
        // active, activated worker without yet controlling THIS particular
        // page load (a normal timing gap right after first registration --
        // confirmed live, 2026-09-18: active/activated but controller was
        // still undefined on the very page that registered it). Checking
        // the worker's own lifecycle state instead of this page's
        // controller relationship is the more reliable signal.
        if (newWorker.state === 'installed' && registration.active) {
          setWaitingWorker(newWorker);
        }
      });
    };

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) {
        return;
      }
      registrationRef.current = registration;

      // An update may already have finished installing and be waiting from
      // before this component mounted. Same reasoning as above: check
      // registration.active, not navigator.serviceWorker.controller.
      if (registration.waiting && registration.active) {
        setWaitingWorker(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        handleUpdateFound(registration);
      });

      // Ask immediately too, in case something was deployed between page
      // load and this component mounting.
      void registration.update();
    });

    const handleControllerChange = () => {
      // The new worker just activated and took control -- reload once to
      // actually run its code. Guarded so a stray extra event can't loop.
      if (!hasReloaded.current) {
        hasReloaded.current = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );

    // iOS throttles background JS timers unreliably, so don't depend on the
    // interval alone -- also check the moment the page becomes visible
    // again (switching back from another app, reopening from the home
    // screen), which is driven by an actual event, not a timer.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void registrationRef.current?.update();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
    };
  }, []);

  useInterval(
    () => {
      void registrationRef.current?.update();
    },
    { delay: UPDATE_CHECK_INTERVAL, isEnabled: !waitingWorker },
  );

  const handleUpdateClick = useCallback(() => {
    if (!waitingWorker) {
      return;
    }
    setUpdating(true);
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }, [waitingWorker]);

  if (!waitingWorker) {
    return null;
  }

  return (
    <div
      className='service-worker-update-notice'
      role='status'
      aria-live='polite'
    >
      <Alert
        isActive
        isLoading={updating}
        title={intl.formatMessage(messages.title)}
        message={intl.formatMessage(messages.message)}
        action={updating ? undefined : intl.formatMessage(messages.action)}
        onActionClick={handleUpdateClick}
        animateFrom='below'
      />
    </div>
  );
};
