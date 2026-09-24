import { createAction } from "@reduxjs/toolkit";

import { apiGetContext, apiSetQuotePolicy } from "flavours/glitch/api/statuses";
import { createDataLoadingThunk } from "flavours/glitch/store/typed_functions";

import type { ApiQuotePolicy } from "../api_types/quotes";

import { importFetchedStatuses } from "./importer";

export const fetchContext = createDataLoadingThunk(
  "status/context",
  ({ statusId }: { statusId: string; prefetchOnly?: boolean }) => apiGetContext(statusId),
  ({ context, refresh }, { dispatch, actionArg: { prefetchOnly = false } }) => {
    const statuses = context.ancestors.concat(context.descendants);

    dispatch(importFetchedStatuses(statuses));

    return {
      context,
      refresh,
      prefetchOnly,
    };
  },
  // A signed-out visitor opening any public post 401s here (confirmed live
  // 2026-09-24) -- this instance requires auth for thread context even
  // though the post itself loads fine anonymously. That's not the same as
  // the post being members-only, so don't show the generic "Members Only"
  // alert over what's otherwise a normal, successful page view.
  { skipAlert: true },
);

export const completeContextRefresh = createAction<{ statusId: string }>("status/context/complete");

export const showPendingReplies = createAction<{ statusId: string }>(
  "status/context/showPendingReplies",
);

export const clearPendingReplies = createAction<{ statusId: string }>(
  "status/context/clearPendingReplies",
);

export const setStatusQuotePolicy = createDataLoadingThunk(
  "status/setQuotePolicy",
  ({ statusId, policy }: { statusId: string; policy: ApiQuotePolicy }) => {
    return apiSetQuotePolicy(statusId, policy);
  },
);
