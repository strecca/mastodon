// Shared "is there a newer MiaCivezza.com than the one running in this tab?"
// logic, used by both the automatic ServiceWorkerUpdateNotice and the manual
// "check for updates" button in the navigation panel.
//
// Two independent signals, so a stale tab can't miss an update:
//   1. The service worker machinery: registration.update() re-fetches sw.js and
//      the browser installs a new worker if the bytes differ (every deploy now
//      changes them -- see the build id stamped in sw.ts).
//   2. A direct check of the live /sw.js text for this bundle's own build id.
//      This still works when the service worker is unregistered, blocked, or a
//      phone resumed a frozen page without ever re-checking.

export type UpdateStatus = "current" | "available" | "error";

const INSTALL_WAIT_MS = 10_000;
const RELOAD_FALLBACK_MS = 4_000;

let reloading = false;

/** Reload the page at most once, however many paths ask for it. */
export function reloadOnce() {
  if (reloading) {
    return;
  }

  reloading = true;
  window.location.reload();
}

function waitForInstall(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      worker.removeEventListener("statechange", onChange);
      window.clearTimeout(timer);
      resolve();
    };

    const onChange = () => {
      if (worker.state !== "installing" && worker.state !== "parsed") {
        finish();
      }
    };

    const timer = window.setTimeout(finish, INSTALL_WAIT_MS);
    worker.addEventListener("statechange", onChange);
    onChange();
  });
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  if (__BUILD_ID__ === "dev") {
    return "current";
  }

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        await registration.update();

        if (registration.installing) {
          await waitForInstall(registration.installing);
        }

        // Check registration.active, not navigator.serviceWorker.controller: a
        // page can have an active worker without controlling this page load.
        if (registration.waiting && registration.active) {
          return "available";
        }
      }
    } catch {
      // Fall through to the direct check below.
    }
  }

  try {
    const response = await fetch("/sw.js", { cache: "no-store", credentials: "omit" });

    if (!response.ok) {
      return "error";
    }

    const text = await response.text();

    return text.includes(__BUILD_ID__) ? "current" : "available";
  } catch {
    return "error";
  }
}

/**
 * Switch this tab to the newest version. Prefers activating a waiting service
 * worker (so the new worker and new page arrive together); otherwise falls back
 * to a plain reload, which fetches fresh HTML pointing at the new bundle.
 */
export async function applyUpdate(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        if (!registration.waiting) {
          await registration.update();

          if (registration.installing) {
            await waitForInstall(registration.installing);
          }
        }

        if (registration.waiting) {
          navigator.serviceWorker.addEventListener("controllerchange", reloadOnce, {
            once: true,
          });
          registration.waiting.postMessage({ type: "SKIP_WAITING" });

          // Safety net for browsers that don't fire controllerchange.
          window.setTimeout(reloadOnce, RELOAD_FALLBACK_MS);
          return;
        }
      }
    }
  } catch {
    // Fall through to a plain reload.
  }

  reloadOnce();
}
