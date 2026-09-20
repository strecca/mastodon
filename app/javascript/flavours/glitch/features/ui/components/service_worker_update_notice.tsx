import { useCallback, useEffect, useRef, useState } from "react";

import { defineMessages, useIntl } from "react-intl";

import { Alert } from "flavours/glitch/components/alert";
import { useInterval } from "flavours/glitch/hooks/useInterval";
import { applyUpdate, checkForUpdate, reloadOnce } from "flavours/glitch/utils/app_update";

// Browsers only check for a new service worker on a fresh page navigation,
// or when explicitly told to via registration.update() -- they do NOT
// proactively re-check while a tab just sits open and idle. Without this,
// someone browsing for a while (exactly the case this feature is for) would
// never see an update prompt no matter how long they waited, since nothing
// would ever prompt the browser to go look. Every deploy now changes sw.js
// (build id stamped in sw.ts), so this poll only needs to be a backstop; the
// wake-from-background checks below are the main trigger on phones.
const UPDATE_CHECK_INTERVAL = 5 * 60_000;

// Wake-up events (visibilitychange, pageshow, focus, online) often arrive in
// bursts; don't hit the network for each one.
const MIN_RESUME_CHECK_GAP = 15_000;

// A page that loaded with no service worker in control (a brand-new visitor's
// first visit) gets claimed by the first worker a few seconds later, which also
// fires "controllerchange". That is not an update, so it must not reload the
// page. Captured at module load, before that claim can happen.
const loadedUnderWorker = "serviceWorker" in navigator && !!navigator.serviceWorker.controller;

const reloadIfWorkerSwapped = () => {
  if (loadedUnderWorker) {
    reloadOnce();
  }
};

const messages = defineMessages({
  title: {
    id: "service_worker_update_notice.title",
    defaultMessage: "Update ready",
  },
  message: {
    id: "service_worker_update_notice.message",
    defaultMessage:
      "A newer, improved version of MiaCivezza.com is ready for you. You'll be back to browsing and posting in under a minute.",
  },
  action: {
    id: "service_worker_update_notice.action",
    defaultMessage: "Update now",
  },
});

/**
 * Tells the member when a newer MiaCivezza.com is available and lets them choose
 * when to apply it -- never silently, since that could interrupt someone
 * mid-post. Detects updates three ways: a new service worker finishing its
 * install, a periodic re-check, and (mainly for phones, which freeze pages in
 * the background) an immediate re-check whenever the app wakes up. The manual
 * "check for updates" button in the navigation panel shares the same logic
 * (utils/app_update.ts). See sw.ts's `message` handler for the other half of
 * the activation handshake.
 */
export const ServiceWorkerUpdateNotice: React.FC = () => {
  const intl = useIntl();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const lastResumeCheck = useRef(0);

  const runResumeCheck = useCallback(() => {
    const now = Date.now();

    if (now - lastResumeCheck.current < MIN_RESUME_CHECK_GAP) {
      return;
    }

    lastResumeCheck.current = now;

    void checkForUpdate().then((status) => {
      if (status === "available") {
        setUpdateAvailable(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleUpdateFound = (registration: ServiceWorkerRegistration) => {
      const newWorker = registration.installing;
      if (!newWorker) {
        return;
      }

      newWorker.addEventListener("statechange", () => {
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
        if (newWorker.state === "installed" && registration.active) {
          setUpdateAvailable(true);
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
        setUpdateAvailable(true);
      }

      registration.addEventListener("updatefound", () => {
        handleUpdateFound(registration);
      });
    });

    // Ask straight away too, in case something was deployed between page
    // load and this component mounting.
    runResumeCheck();

    // The new worker just activated and took control -- reload once to
    // actually run its code. Shared guard so a stray extra event (or the
    // button's own handler) can't loop.
    navigator.serviceWorker.addEventListener("controllerchange", reloadIfWorkerSwapped);

    // iOS throttles and freezes background pages, so don't depend on the
    // interval alone: re-check the moment the app wakes up (switching back
    // from another app, reopening from the home screen, regaining network).
    // These are driven by real events, not timers.
    const handleWake = () => {
      if (document.visibilityState === "visible") {
        runResumeCheck();
      }
    };
    document.addEventListener("visibilitychange", handleWake);
    window.addEventListener("pageshow", handleWake);
    window.addEventListener("focus", handleWake);
    window.addEventListener("online", handleWake);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", reloadIfWorkerSwapped);
      document.removeEventListener("visibilitychange", handleWake);
      window.removeEventListener("pageshow", handleWake);
      window.removeEventListener("focus", handleWake);
      window.removeEventListener("online", handleWake);
    };
  }, [runResumeCheck]);

  useInterval(
    () => {
      void registrationRef.current?.update();
    },
    { delay: UPDATE_CHECK_INTERVAL, isEnabled: !updateAvailable },
  );

  const handleUpdateClick = useCallback(() => {
    setUpdating(true);
    void applyUpdate();
  }, []);

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="service-worker-update-notice" role="status" aria-live="polite">
      <Alert
        isActive
        isLoading={updating}
        title={intl.formatMessage(messages.title)}
        message={intl.formatMessage(messages.message)}
        action={updating ? undefined : intl.formatMessage(messages.action)}
        onActionClick={handleUpdateClick}
        animateFrom="below"
      />
    </div>
  );
};
