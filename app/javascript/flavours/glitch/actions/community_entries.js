// app/javascript/flavours/glitch/actions/community_entries.js
//
// Generic action creators for ALL community directory categories.
// Each generated feature (community_artists, community_events, etc.)
// uses these same actions, differentiated by categoryKey.
// The reducer at reducers/community_entries.js stores state keyed by category.

import api from '../api';

// Action type factory — produces unique types per category
export const types = (categoryKey) => ({
  FETCH_REQUEST:  `COMMUNITY_ENTRIES/${categoryKey}/FETCH_REQUEST`,
  FETCH_SUCCESS:  `COMMUNITY_ENTRIES/${categoryKey}/FETCH_SUCCESS`,
  FETCH_FAIL:     `COMMUNITY_ENTRIES/${categoryKey}/FETCH_FAIL`,
  FETCH_ONE_REQUEST: `COMMUNITY_ENTRIES/${categoryKey}/FETCH_ONE_REQUEST`,
  FETCH_ONE_SUCCESS: `COMMUNITY_ENTRIES/${categoryKey}/FETCH_ONE_SUCCESS`,
  FETCH_ONE_FAIL:    `COMMUNITY_ENTRIES/${categoryKey}/FETCH_ONE_FAIL`,
  CREATE_REQUEST: `COMMUNITY_ENTRIES/${categoryKey}/CREATE_REQUEST`,
  CREATE_SUCCESS: `COMMUNITY_ENTRIES/${categoryKey}/CREATE_SUCCESS`,
  CREATE_FAIL:    `COMMUNITY_ENTRIES/${categoryKey}/CREATE_FAIL`,
  UPDATE_REQUEST: `COMMUNITY_ENTRIES/${categoryKey}/UPDATE_REQUEST`,
  UPDATE_SUCCESS: `COMMUNITY_ENTRIES/${categoryKey}/UPDATE_SUCCESS`,
  UPDATE_FAIL:    `COMMUNITY_ENTRIES/${categoryKey}/UPDATE_FAIL`,
  DELETE_SUCCESS: `COMMUNITY_ENTRIES/${categoryKey}/DELETE_SUCCESS`,
  CLEAR_CURRENT:  `COMMUNITY_ENTRIES/${categoryKey}/CLEAR_CURRENT`,
});

// ── Fetch list (with optional search query) ───────────────────

export const fetchEntries = (categoryKey, apiEndpoint, query = '', page = 1, sort = 'newest') => (dispatch) => {
  const t = types(categoryKey);
  dispatch({ type: t.FETCH_REQUEST, categoryKey });

  const params = { sort };
  if (page > 1) params.page = page;
  if (query) params.q = query;

  api().get(apiEndpoint, { params }).then(response => {
    dispatch({
      type: t.FETCH_SUCCESS,
      categoryKey,
      entries: response.data.entries || response.data,
      total: response.data.total || 0,
      page: response.data.page || 1,
      pages: response.data.pages || 1,
    });
  }).catch(error => {
    const status = error?.response?.status;
    console.error(`[community_entries] ${categoryKey} fetch failed — HTTP ${status ?? 'network error'}`, error);
    dispatch({ type: t.FETCH_FAIL, categoryKey, error, skipAlert: true });
  });
};

// ── Fetch single entry ────────────────────────────────────────

export const fetchEntry = (categoryKey, apiEndpoint, id) => (dispatch) => {
  const t = types(categoryKey);
  dispatch({ type: t.FETCH_ONE_REQUEST, categoryKey });

  api().get(`${apiEndpoint}/${id}`).then(response => {
    dispatch({
      type: t.FETCH_ONE_SUCCESS,
      categoryKey,
      entry: response.data,
    });
  }).catch(error => {
    dispatch({ type: t.FETCH_ONE_FAIL, categoryKey, error });
  });
};

// ── Create entry ──────────────────────────────────────────────

export const createEntry = (categoryKey, apiEndpoint, formData) => (dispatch) => {
  const t = types(categoryKey);
  dispatch({ type: t.CREATE_REQUEST, categoryKey });

  const isMultipart = formData instanceof FormData;
  const body    = isMultipart ? formData : { entry: formData };
  const headers = isMultipart ? { 'Content-Type': 'multipart/form-data' } : {};

  return api().post(apiEndpoint, body, { headers }).then(response => {
    dispatch({
      type: t.CREATE_SUCCESS,
      categoryKey,
      entry: response.data,
    });
    return response.data;
  }).catch(error => {
    dispatch({ type: t.CREATE_FAIL, categoryKey, error });
    throw error;
  });
};

// ── Update entry ──────────────────────────────────────────────

export const updateEntry = (categoryKey, apiEndpoint, id, formData) => (dispatch) => {
  const t = types(categoryKey);
  dispatch({ type: t.UPDATE_REQUEST, categoryKey });

  const isMultipart = formData instanceof FormData;
  const body    = isMultipart ? formData : { entry: formData };
  const headers = isMultipart ? { 'Content-Type': 'multipart/form-data' } : {};

  return api().put(`${apiEndpoint}/${id}`, body, { headers }).then(response => {
    dispatch({
      type: t.UPDATE_SUCCESS,
      categoryKey,
      entry: response.data,
    });
    return response.data;
  }).catch(error => {
    dispatch({ type: t.UPDATE_FAIL, categoryKey, error });
    throw error;
  });
};

// ── Delete entry ──────────────────────────────────────────────

export const deleteEntry = (categoryKey, apiEndpoint, id) => (dispatch) => {
  const t = types(categoryKey);

  return api().delete(`${apiEndpoint}/${id}`).then(() => {
    dispatch({ type: t.DELETE_SUCCESS, categoryKey, id });
  });
};

// ── Clear current entry ───────────────────────────────────────

export const clearCurrentEntry = (categoryKey) => ({
  type: types(categoryKey).CLEAR_CURRENT,
  categoryKey,
});
