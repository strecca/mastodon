import type { List as ImmutableList } from "immutable";

import { apiGetDirectory } from "flavours/glitch/api/directory";
import { createDataLoadingThunk } from "flavours/glitch/store/typed_functions";

import { fetchRelationships } from "./accounts";
import { importFetchedAccounts } from "./importer";

const DIRECTORY_FETCH_LIMIT = 20;

export const fetchDirectory = createDataLoadingThunk(
  "directory/fetch",
  async (params: Parameters<typeof apiGetDirectory>[0]) =>
    apiGetDirectory(params, DIRECTORY_FETCH_LIMIT),
  (data, { dispatch }) => {
    dispatch(importFetchedAccounts(data));
    dispatch(fetchRelationships(data.map((x) => x.id)));

    return { accounts: data, isLast: data.length < DIRECTORY_FETCH_LIMIT };
  },
  // The directory API is members-only on this instance, so a signed-out
  // visitor always 401s here -- and features/directory/index.tsx already
  // shows its own inline "Members Only / Sign Up Free" box for exactly that
  // case. Without this, the generic sliding alert duplicated it on top
  // (found by a signed-out live crawl, 2026-10-21).
  { skipAlert: true },
);

export const expandDirectory = createDataLoadingThunk(
  "directory/expand",
  async (params: Parameters<typeof apiGetDirectory>[0], { getState }) => {
    const loadedItems = getState().user_lists.getIn([
      "directory",
      "items",
    ]) as ImmutableList<unknown>;

    return apiGetDirectory({ ...params, offset: loadedItems.size }, DIRECTORY_FETCH_LIMIT);
  },
  (data, { dispatch }) => {
    dispatch(importFetchedAccounts(data));
    dispatch(fetchRelationships(data.map((x) => x.id)));

    return { accounts: data, isLast: data.length < DIRECTORY_FETCH_LIMIT };
  },
  // Same reasoning as fetchDirectory above.
  { skipAlert: true },
);
