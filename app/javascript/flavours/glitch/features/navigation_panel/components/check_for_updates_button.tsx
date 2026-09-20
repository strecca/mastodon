import { useCallback, useEffect, useState } from "react";

import { defineMessages, useIntl } from "react-intl";

import { applyUpdate, checkForUpdate } from "flavours/glitch/utils/app_update";

type Phase = "idle" | "checking" | "current" | "available" | "updating" | "error";

// How long the "up to date" / "couldn't check" result stays on screen before
// the button goes back to its normal label.
const RESULT_LINGER_MS = 7_000;

const messages = defineMessages({
  check: {
    id: "app_update.check",
    defaultMessage: "Click here to check for updates on MiaCivezza.com",
  },
  checking: {
    id: "app_update.checking",
    defaultMessage: "Checking for updates…",
  },
  current: {
    id: "app_update.current",
    defaultMessage: "You're up to date. MiaCivezza.com is the latest version.",
  },
  available: {
    id: "app_update.available",
    defaultMessage: "YES, new update available. Click here to update and continue",
  },
  updating: {
    id: "app_update.updating",
    defaultMessage: "Updating…",
  },
  error: {
    id: "app_update.error",
    defaultMessage: "Couldn't check for updates. Check your connection and tap to try again.",
  },
});

/**
 * Manual "is there a newer MiaCivezza.com?" button for the navigation panel.
 * Members on phones can end up on a stale copy of the app (a frozen home-screen
 * app never reloads on its own); this gives them a way to check and update
 * without knowing anything about caches or service workers. Uses the same
 * logic as the automatic update notice.
 */
export const CheckForUpdatesButton: React.FC = () => {
  const intl = useIntl();
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (phase !== "current" && phase !== "error") {
      return;
    }

    const timer = window.setTimeout(() => {
      setPhase("idle");
    }, RESULT_LINGER_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase]);

  const handleClick = useCallback(() => {
    if (phase === "checking" || phase === "updating") {
      return;
    }

    if (phase === "available") {
      setPhase("updating");
      void applyUpdate();
      return;
    }

    setPhase("checking");

    void checkForUpdate().then((status) => {
      setPhase(status === "available" ? "available" : status === "current" ? "current" : "error");
    });
  }, [phase]);

  const busy = phase === "checking" || phase === "updating";

  const label = {
    idle: messages.check,
    checking: messages.checking,
    current: messages.current,
    available: messages.available,
    updating: messages.updating,
    error: messages.error,
  }[phase];

  return (
    <button
      type="button"
      className={`app-update-button app-update-button--${phase}`}
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      aria-live="polite"
    >
      {intl.formatMessage(label)}
    </button>
  );
};
