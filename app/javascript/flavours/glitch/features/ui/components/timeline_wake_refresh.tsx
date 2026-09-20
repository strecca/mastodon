import { useCallback } from "react";

import { useCommunityLiveRefresh } from "flavours/glitch/hooks/useCommunityLiveRefresh";
import { useAppDispatch } from "flavours/glitch/store";

interface Props {
  // Names this feed (for diagnostics only; no stream is opened).
  feedKey: string;
  // Returns the refresh thunk for this feed, e.g. () => refreshHomeTimeline().
  refresh: () => unknown;
}

/**
 * Catches a timeline up when the app returns to the foreground or the network
 * returns: adds new posts and removes posts deleted meanwhile. A frozen or
 * offline page never receives the live "delete" event, and a signed-out visitor
 * has no live stream at all, so this is the only thing that can remove them.
 */
export const TimelineWakeRefresh: React.FC<Props> = ({ feedKey, refresh }) => {
  const dispatch = useAppDispatch();

  const run = useCallback(() => {
    dispatch(refresh() as never);
  }, [dispatch, refresh]);

  useCommunityLiveRefresh(`live_posts_${feedKey}`, run, { stream: false });

  return null;
};
