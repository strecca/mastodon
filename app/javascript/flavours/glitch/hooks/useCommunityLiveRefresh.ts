import { useEffect, useRef } from "react";

import { useIdentity } from "flavours/glitch/identity_context";
import { useAppDispatch } from "flavours/glitch/store";
import { connectStream } from "flavours/glitch/stream";

const MIN_GAP_MS = 15_000;

/**
 * Keeps a community page current without the member doing anything.
 *
 * Calls `refresh` when:
 *  - the server pushes a "refresh" for this category (someone added, edited or
 *    deleted an entry) -- signed-in members only, the stream needs a token;
 *  - the live connection comes back after dropping;
 *  - the app returns to the foreground or the network comes back. A phone that
 *    froze the page in the background never receives pushes, so this is what
 *    catches it up. It applies to signed-out visitors too.
 *
 * Pass `{ stream: false }` for a page that already has its own live stream
 * (the Live Posts timeline) and only needs the wake-up refresh.
 *
 * Wake-up and reconnect refreshes are throttled to one per 15 seconds.
 * `refresh` should update data in place, without a loading spinner.
 */
export function useCommunityLiveRefresh(
  channelKey: string,
  refresh: () => void,
  { stream = true }: { stream?: boolean } = {},
) {
  const dispatch = useAppDispatch();
  const { signedIn } = useIdentity();
  const refreshRef = useRef(refresh);
  const lastRunRef = useRef(0);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    // The page has just loaded its own data, so start the throttle window now.
    lastRunRef.current = Date.now();

    const run = (force: boolean) => {
      const now = Date.now();

      if (!force && now - lastRunRef.current < MIN_GAP_MS) {
        return;
      }

      lastRunRef.current = now;
      refreshRef.current();
    };

    const onWake = () => {
      if (document.visibilityState === "visible") {
        run(false);
      }
    };

    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("pageshow", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);

    let disconnect: (() => void) | undefined;

    if (signedIn && stream) {
      let connectedBefore = false;

      // connectStream is an untyped JS thunk creator that returns the disconnect function.
      const thunk = (connectStream as (...args: unknown[]) => unknown)(
        `community:${channelKey}`,
        {},
        () => ({
          onConnect() {
            // The first connect is the page just loading; later ones are reconnects.
            if (connectedBefore) {
              run(false);
            }

            connectedBefore = true;
          },
          onDisconnect() {
            // Reconnects are handled in onConnect.
          },
          onReceive(data: { event: string }) {
            if (data.event === "refresh") {
              run(true);
            }
          },
        }),
      ) as Parameters<typeof dispatch>[0];

      disconnect = dispatch(thunk) as unknown as () => void;
    }

    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("pageshow", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      disconnect?.();
    };
  }, [dispatch, signedIn, channelKey, stream]);
}
