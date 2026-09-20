import { Map as ImmutableMap, List as ImmutableList } from "immutable";

import api, { getLinks } from "flavours/glitch/api";
import { compareId } from "flavours/glitch/compare_id";
import { usePendingItems as preferPendingItems } from "flavours/glitch/initial_state";
import { toServerSideType } from "flavours/glitch/utils/filters";

import { importFetchedStatus, importFetchedStatuses } from "./importer";
import { submitMarkers } from "./markers";
import { timelineDelete, isNonStatusId } from "./timelines_typed";

export { disconnectTimeline } from "./timelines_typed";

export const TIMELINE_UPDATE = "TIMELINE_UPDATE";
export const TIMELINE_CLEAR = "TIMELINE_CLEAR";

export const TIMELINE_EXPAND_REQUEST = "TIMELINE_EXPAND_REQUEST";
export const TIMELINE_EXPAND_SUCCESS = "TIMELINE_EXPAND_SUCCESS";
export const TIMELINE_EXPAND_FAIL = "TIMELINE_EXPAND_FAIL";

export const TIMELINE_SCROLL_TOP = "TIMELINE_SCROLL_TOP";
export const TIMELINE_LOAD_PENDING = "TIMELINE_LOAD_PENDING";
export const TIMELINE_CONNECT = "TIMELINE_CONNECT";

export const TIMELINE_MARK_AS_PARTIAL = "TIMELINE_MARK_AS_PARTIAL";
export const TIMELINE_INSERT = "TIMELINE_INSERT";

// When adding new special markers here, make sure to update TIMELINE_NON_STATUS_MARKERS in actions/timelines_typed.js
export const TIMELINE_SUGGESTIONS = "inline-follow-suggestions";
export const TIMELINE_GAP = null;
export const TIMELINE_PINNED_VIEW_ALL = "pinned-view-all";

export const TIMELINE_NON_STATUS_MARKERS = [
  TIMELINE_GAP,
  TIMELINE_SUGGESTIONS,
  TIMELINE_PINNED_VIEW_ALL,
];

export const loadPending = (timeline) => ({
  type: TIMELINE_LOAD_PENDING,
  timeline,
});

export function updateTimeline(
  timeline,
  status,
  { accept = undefined, bogusQuotePolicy = false } = {},
) {
  return (dispatch, getState) => {
    if (typeof accept === "function" && !accept(status)) {
      return;
    }

    if (getState().getIn(["timelines", timeline, "isPartial"])) {
      // Prevent new items from being added to a partial timeline,
      // since it will be reloaded anyway

      return;
    }

    let filtered = false;

    if (status.filtered) {
      const contextType = toServerSideType(timeline);
      const filters = status.filtered.filter((result) =>
        result.filter.context.includes(contextType),
      );

      filtered = filters.length > 0;
    }

    dispatch(importFetchedStatus(status, { bogusQuotePolicy }));

    dispatch({
      type: TIMELINE_UPDATE,
      timeline,
      status,
      usePendingItems: preferPendingItems,
      filtered,
    });

    if (timeline === "home") {
      dispatch(submitMarkers());
    }
  };
}

export function deleteFromTimelines(id) {
  return (dispatch, getState) => {
    const accountId = getState().getIn(["statuses", id, "account"]);
    const references = getState()
      .get("statuses")
      .filter((status) => status.get("reblog") === id)
      .map((status) => status.get("id"))
      .valueSeq()
      .toJSON();
    const reblogOf = getState().getIn(["statuses", id, "reblog"], null);

    dispatch(timelineDelete({ statusId: id, accountId, references, reblogOf }));
  };
}

export function clearTimeline(timeline) {
  return (dispatch) => {
    dispatch({ type: TIMELINE_CLEAR, timeline });
  };
}

const parseTags = (tags = {}, mode) => {
  return (tags[mode] || []).map((tag) => {
    return tag.value;
  });
};

export function expandTimeline(timelineId, path, params = {}) {
  return async (dispatch, getState) => {
    const timeline = getState().getIn(["timelines", timelineId], ImmutableMap());
    const isLoadingMore = !!params.max_id;

    if (timeline.get("isLoading")) {
      return;
    }

    if (
      !params.max_id &&
      !params.pinned &&
      timeline.get("items", ImmutableList()).size +
        timeline.get("pendingItems", ImmutableList()).size >
        0
    ) {
      const a = timeline.getIn(["pendingItems", 0]);
      const b = timeline.getIn(["items", 0]);

      if (a && b && compareId(a, b) > 0) {
        params.since_id = a;
      } else {
        params.since_id = b || a;
      }
    }

    const isLoadingRecent = !!params.since_id;

    dispatch(expandTimelineRequest(timelineId, isLoadingMore));

    try {
      const response = await api().get(path, { params });
      const next = getLinks(response).refs.find((link) => link.rel === "next");

      dispatch(importFetchedStatuses(response.data));
      dispatch(
        expandTimelineSuccess(
          timelineId,
          response.data,
          next ? next.uri : null,
          response.status === 206,
          isLoadingRecent,
          isLoadingMore,
          isLoadingRecent && preferPendingItems,
        ),
      );

      if (timelineId === "home" && !isLoadingMore && !isLoadingRecent) {
        const now = new Date();
        const fittingIndex = response.data.findIndex(
          (status) => now - new Date(status.created_at) > 4 * 3600 * 1000,
        );

        if (fittingIndex !== -1) {
          dispatch(insertIntoTimeline(timelineId, TIMELINE_SUGGESTIONS, Math.max(1, fittingIndex)));
        }
      }

      if (timelineId === "home") {
        dispatch(submitMarkers());
      }
    } catch (error) {
      dispatch(expandTimelineFail(timelineId, error, isLoadingMore));
    }
  };
}

const REFRESH_PAGE_SIZE = 20;

// Reconcile the newest page of an already-loaded timeline with the server: drop
// statuses that were deleted (or hidden) since they were loaded, update edited
// ones in place, and pull in newer ones (`loadNewer` returns the thunk for that).
//
// Live "delete" events are fire-and-forget over a websocket, so a page that was
// frozen or offline -- or a signed-out visitor, who has no stream at all --
// never hears about deletions. Normal loading only ever asks for statuses
// *newer* than the ones held, so nothing else would remove them.
export function refreshTimeline(timelineId, path, params, loadNewer) {
  return async (dispatch, getState) => {
    const initial = getState().getIn(["timelines", timelineId]);

    // Nothing loaded yet (or a load is running): the normal load covers it.
    if (!initial || initial.get("isLoading")) {
      return;
    }

    let page;

    try {
      const response = await api().get(path, { params: { ...params, limit: REFRESH_PAGE_SIZE } });

      // 206: the server is still building this feed, so the page is incomplete.
      if (response.status === 206) {
        return;
      }

      page = response.data;
    } catch {
      // Offline or the server hiccuped: keep what is on screen.
      return;
    }

    // An empty answer is more likely a hiccup than a feed emptied of everything.
    if (page.length === 0) {
      return;
    }

    dispatch(importFetchedStatuses(page));

    const timeline = getState().getIn(["timelines", timelineId], ImmutableMap());
    const held = timeline
      .get("items", ImmutableList())
      .concat(timeline.get("pendingItems", ImmutableList()))
      .filter((id) => !isNonStatusId(id));

    const freshIds = new Set(page.map((status) => status.id));
    const heldIds = new Set(held.toArray());

    // Only statuses inside the range this page covers can be judged deleted:
    // one newer than the page's newest entry may have just arrived over the live
    // stream. A short page means the whole feed fit in it, so nothing older
    // survives either; otherwise the page vouches only down to its oldest entry.
    const newestFresh = page[0].id;
    const oldestFresh = page[page.length - 1].id;
    const coversAll = page.length < REFRESH_PAGE_SIZE;

    held
      .filter(
        (id) =>
          !freshIds.has(id) &&
          compareId(id, newestFresh) <= 0 &&
          (coversAll || compareId(id, oldestFresh) >= 0),
      )
      .forEach((id) => {
        dispatch(deleteFromTimelines(id));
      });

    const newest = held.reduce(
      (max, id) => (max === null || compareId(id, max) > 0 ? id : max),
      null,
    );

    if (
      page.some(
        (status) =>
          !heldIds.has(status.id) && (newest === null || compareId(status.id, newest) > 0),
      )
    ) {
      dispatch(loadNewer());
    }
  };
}

export function fillTimelineGaps(timelineId, path, params = {}) {
  return async (dispatch, getState) => {
    const timeline = getState().getIn(["timelines", timelineId], ImmutableMap());
    const items = timeline.get("items");
    const nullIndexes = items.map((statusId, index) => (statusId === null ? index : null));
    const gaps = nullIndexes.map((index) => (index > 0 ? items.get(index - 1) : null));

    // Only expand at most two gaps to avoid doing too many requests
    for (const maxId of gaps.take(2)) {
      await dispatch(expandTimeline(timelineId, path, { ...params, maxId }));
    }
  };
}

export const expandHomeTimeline = ({ maxId } = {}) =>
  expandTimeline("home", "/api/v1/timelines/home", { max_id: maxId });
export const expandPublicTimeline = ({ maxId, onlyMedia, onlyRemote, allowLocalOnly } = {}) =>
  expandTimeline(
    `public${onlyRemote ? ":remote" : allowLocalOnly ? ":allow_local_only" : ""}${onlyMedia ? ":media" : ""}`,
    "/api/v1/timelines/public",
    {
      remote: !!onlyRemote,
      allow_local_only: !!allowLocalOnly,
      max_id: maxId,
      only_media: !!onlyMedia,
    },
  );
export const refreshPublicTimeline = ({ onlyMedia, onlyRemote, allowLocalOnly } = {}) =>
  refreshTimeline(
    `public${onlyRemote ? ":remote" : allowLocalOnly ? ":allow_local_only" : ""}${onlyMedia ? ":media" : ""}`,
    "/api/v1/timelines/public",
    { remote: !!onlyRemote, allow_local_only: !!allowLocalOnly, only_media: !!onlyMedia },
    () => expandPublicTimeline({ onlyMedia, onlyRemote, allowLocalOnly }),
  );
export const expandCommunityTimeline = ({ maxId, onlyMedia } = {}) =>
  expandTimeline(`community${onlyMedia ? ":media" : ""}`, "/api/v1/timelines/public", {
    local: true,
    max_id: maxId,
    only_media: !!onlyMedia,
  });
export const refreshCommunityTimeline = ({ onlyMedia } = {}) =>
  refreshTimeline(
    `community${onlyMedia ? ":media" : ""}`,
    "/api/v1/timelines/public",
    { local: true, only_media: !!onlyMedia },
    () => expandCommunityTimeline({ onlyMedia }),
  );
export const expandDirectTimeline = ({ maxId } = {}) =>
  expandTimeline("direct", "/api/v1/timelines/direct", { max_id: maxId });
export const expandAccountTimeline = (accountId, { maxId, withReplies, tagged } = {}) =>
  expandTimeline(
    `account:${accountId}${withReplies ? ":with_replies" : ""}${tagged ? `:${tagged}` : ""}`,
    `/api/v1/accounts/${accountId}/statuses`,
    { exclude_replies: !withReplies, exclude_reblogs: withReplies, tagged, max_id: maxId },
  );
export const expandAccountFeaturedTimeline = (accountId, { tagged } = {}) =>
  expandTimeline(`account:${accountId}:pinned`, `/api/v1/accounts/${accountId}/statuses`, {
    pinned: true,
    tagged,
  });
export const expandAccountMediaTimeline = (accountId, { maxId, withReplies } = {}) =>
  expandTimeline(
    `account:${accountId}:media${withReplies ? ":with_replies" : ""}`,
    `/api/v1/accounts/${accountId}/statuses`,
    { max_id: maxId, only_media: true, limit: 40, exclude_replies: !withReplies },
  );
export const expandListTimeline = (id, { maxId } = {}) =>
  expandTimeline(`list:${id}`, `/api/v1/timelines/list/${id}`, { max_id: maxId });
export const expandLinkTimeline = (url, { maxId } = {}) =>
  expandTimeline(`link:${url}`, `/api/v1/timelines/link`, { url, max_id: maxId });
export const expandHashtagTimeline = (hashtag, { maxId, tags, local } = {}) => {
  return expandTimeline(
    `hashtag:${hashtag}${local ? ":local" : ""}`,
    `/api/v1/timelines/tag/${hashtag}`,
    {
      max_id: maxId,
      any: parseTags(tags, "any"),
      all: parseTags(tags, "all"),
      none: parseTags(tags, "none"),
      local: local,
    },
  );
};

export const refreshHomeTimeline = () =>
  refreshTimeline("home", "/api/v1/timelines/home", {}, () => expandHomeTimeline());
export const refreshListTimeline = (id) =>
  refreshTimeline(`list:${id}`, `/api/v1/timelines/list/${id}`, {}, () => expandListTimeline(id));
export const refreshHashtagTimeline = (hashtag, { tags, local } = {}) =>
  refreshTimeline(
    `hashtag:${hashtag}${local ? ":local" : ""}`,
    `/api/v1/timelines/tag/${hashtag}`,
    {
      any: parseTags(tags, "any"),
      all: parseTags(tags, "all"),
      none: parseTags(tags, "none"),
      local: local,
    },
    () => expandHashtagTimeline(hashtag, { tags, local }),
  );

export const fillHomeTimelineGaps = () => fillTimelineGaps("home", "/api/v1/timelines/home", {});
export const fillPublicTimelineGaps = ({ onlyMedia, onlyRemote, allowLocalOnly } = {}) =>
  fillTimelineGaps(
    `public${onlyRemote ? ":remote" : allowLocalOnly ? ":allow_local_only" : ""}${onlyMedia ? ":media" : ""}`,
    "/api/v1/timelines/public",
    { remote: !!onlyRemote, only_media: !!onlyMedia, allow_local_only: !!allowLocalOnly },
  );
export const fillCommunityTimelineGaps = ({ onlyMedia } = {}) =>
  fillTimelineGaps(`community${onlyMedia ? ":media" : ""}`, "/api/v1/timelines/public", {
    local: true,
    only_media: !!onlyMedia,
  });
export const fillListTimelineGaps = (id) =>
  fillTimelineGaps(`list:${id}`, `/api/v1/timelines/list/${id}`, {});

export function expandTimelineRequest(timeline, isLoadingMore) {
  return {
    type: TIMELINE_EXPAND_REQUEST,
    timeline,
    skipLoading: !isLoadingMore,
  };
}

export function expandTimelineSuccess(
  timeline,
  statuses,
  next,
  partial,
  isLoadingRecent,
  isLoadingMore,
  usePendingItems,
) {
  return {
    type: TIMELINE_EXPAND_SUCCESS,
    timeline,
    statuses,
    next,
    partial,
    isLoadingRecent,
    usePendingItems,
    skipLoading: !isLoadingMore,
  };
}

export function expandTimelineFail(timeline, error, isLoadingMore) {
  return {
    type: TIMELINE_EXPAND_FAIL,
    timeline,
    error,
    skipLoading: !isLoadingMore,
    skipNotFound: timeline.startsWith("account:"),
  };
}

export function scrollTopTimeline(timeline, top) {
  return {
    type: TIMELINE_SCROLL_TOP,
    timeline,
    top,
  };
}

export function connectTimeline(timeline) {
  return {
    type: TIMELINE_CONNECT,
    timeline,
    usePendingItems: preferPendingItems,
  };
}

export const markAsPartial = (timeline) => ({
  type: TIMELINE_MARK_AS_PARTIAL,
  timeline,
});

export const insertIntoTimeline = (timeline, key, index) => ({
  type: TIMELINE_INSERT,
  timeline,
  index,
  key,
});
