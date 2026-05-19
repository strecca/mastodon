// app/javascript/flavours/glitch/actions/community_directory.js

import api from '../api';

// ── Categories ────────────────────────────────────────────────

export const COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST = 'COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST';
export const COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS = 'COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS';
export const COMMUNITY_DIR_CATEGORIES_FETCH_FAIL    = 'COMMUNITY_DIR_CATEGORIES_FETCH_FAIL';

export const COMMUNITY_DIR_GENERATE_REQUEST = 'COMMUNITY_DIR_GENERATE_REQUEST';
export const COMMUNITY_DIR_GENERATE_SUCCESS = 'COMMUNITY_DIR_GENERATE_SUCCESS';
export const COMMUNITY_DIR_GENERATE_FAIL    = 'COMMUNITY_DIR_GENERATE_FAIL';

// ── Moderation ────────────────────────────────────────────────

export const COMMUNITY_DIR_MODERATION_FETCH_REQUEST = 'COMMUNITY_DIR_MODERATION_FETCH_REQUEST';
export const COMMUNITY_DIR_MODERATION_FETCH_SUCCESS = 'COMMUNITY_DIR_MODERATION_FETCH_SUCCESS';
export const COMMUNITY_DIR_MODERATION_FETCH_FAIL    = 'COMMUNITY_DIR_MODERATION_FETCH_FAIL';
export const COMMUNITY_DIR_MODERATION_ENTRY_REMOVED = 'COMMUNITY_DIR_MODERATION_ENTRY_REMOVED';

// ── Permissions ───────────────────────────────────────────────

export const COMMUNITY_DIR_PERMISSIONS_FETCH_REQUEST = 'COMMUNITY_DIR_PERMISSIONS_FETCH_REQUEST';
export const COMMUNITY_DIR_PERMISSIONS_FETCH_SUCCESS = 'COMMUNITY_DIR_PERMISSIONS_FETCH_SUCCESS';
export const COMMUNITY_DIR_PERMISSIONS_FETCH_FAIL    = 'COMMUNITY_DIR_PERMISSIONS_FETCH_FAIL';
export const COMMUNITY_DIR_PERMISSION_SAVE_SUCCESS   = 'COMMUNITY_DIR_PERMISSION_SAVE_SUCCESS';
export const COMMUNITY_DIR_PERMISSION_DELETE_SUCCESS = 'COMMUNITY_DIR_PERMISSION_DELETE_SUCCESS';

// ── Settings ─────────────────────────────────────────────────

export const COMMUNITY_DIR_SETTINGS_FETCH_REQUEST = 'COMMUNITY_DIR_SETTINGS_FETCH_REQUEST';
export const COMMUNITY_DIR_SETTINGS_FETCH_SUCCESS = 'COMMUNITY_DIR_SETTINGS_FETCH_SUCCESS';
export const COMMUNITY_DIR_SETTINGS_FETCH_FAIL    = 'COMMUNITY_DIR_SETTINGS_FETCH_FAIL';
export const COMMUNITY_DIR_SETTING_SAVE_SUCCESS   = 'COMMUNITY_DIR_SETTING_SAVE_SUCCESS';

// ── Action creators ───────────────────────────────────────────

export const fetchCategories = () => (dispatch) => {
  dispatch({ type: COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST });
  api().get('/api/v1/community_directory/categories').then(response => {
    dispatch({ type: COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS, categories: response.data });
  }).catch(error => {
    dispatch({ type: COMMUNITY_DIR_CATEGORIES_FETCH_FAIL, error, skipAlert: true });
  });
};

export const generateCategory = (config) => (dispatch) => {
  dispatch({ type: COMMUNITY_DIR_GENERATE_REQUEST });
  return api().post('/api/v1/community_directory/generate', config).then(response => {
    dispatch({ type: COMMUNITY_DIR_GENERATE_SUCCESS, result: response.data });
    return response.data;
  }).catch(error => {
    dispatch({ type: COMMUNITY_DIR_GENERATE_FAIL, error });
    throw error;
  });
};

export const fetchCategory = (name) => () =>
  api().get(`/api/v1/community_directory/categories/${name}`).then(r => r.data);

export const updateCategory = (name, config) => () =>
  api().patch(`/api/v1/community_directory/categories/${name}`, config).then(r => r.data);

// Moderation

export const fetchModeration = () => (dispatch) => {
  dispatch({ type: COMMUNITY_DIR_MODERATION_FETCH_REQUEST });
  api().get('/api/v1/community_directory/moderation').then(response => {
    dispatch({ type: COMMUNITY_DIR_MODERATION_FETCH_SUCCESS, entries: response.data });
  }).catch(error => {
    dispatch({ type: COMMUNITY_DIR_MODERATION_FETCH_FAIL, error, skipAlert: true });
  });
};

export const approveEntry = (categoryKey, entryId) => (dispatch) =>
  api().put('/api/v1/community_directory/moderation/approve', { category_key: categoryKey, entry_id: entryId })
    .then(() => {
      dispatch({ type: COMMUNITY_DIR_MODERATION_ENTRY_REMOVED, categoryKey, entryId });
    });

export const rejectEntry = (categoryKey, entryId) => (dispatch) =>
  api().put('/api/v1/community_directory/moderation/reject', { category_key: categoryKey, entry_id: entryId })
    .then(() => {
      dispatch({ type: COMMUNITY_DIR_MODERATION_ENTRY_REMOVED, categoryKey, entryId });
    });

// Permissions

export const fetchPermissions = () => (dispatch) => {
  dispatch({ type: COMMUNITY_DIR_PERMISSIONS_FETCH_REQUEST });
  api().get('/api/v1/community_directory/permissions').then(response => {
    dispatch({ type: COMMUNITY_DIR_PERMISSIONS_FETCH_SUCCESS, permissions: response.data });
  }).catch(error => {
    dispatch({ type: COMMUNITY_DIR_PERMISSIONS_FETCH_FAIL, error, skipAlert: true });
  });
};

export const savePermission = (data) => (dispatch) =>
  api().post('/api/v1/community_directory/permissions', data).then(response => {
    dispatch({ type: COMMUNITY_DIR_PERMISSION_SAVE_SUCCESS, permission: response.data });
    return response.data;
  });

export const deletePermission = (id) => (dispatch) =>
  api().delete(`/api/v1/community_directory/permissions/${id}`).then(() => {
    dispatch({ type: COMMUNITY_DIR_PERMISSION_DELETE_SUCCESS, id });
  });

// Settings

export const fetchSettings = () => (dispatch) => {
  dispatch({ type: COMMUNITY_DIR_SETTINGS_FETCH_REQUEST });
  api().get('/api/v1/community_directory/settings').then(response => {
    dispatch({ type: COMMUNITY_DIR_SETTINGS_FETCH_SUCCESS, settings: response.data });
  }).catch(error => {
    dispatch({ type: COMMUNITY_DIR_SETTINGS_FETCH_FAIL, error, skipAlert: true });
  });
};

export const saveSetting = (categoryKey, data) => (dispatch) =>
  api().put(`/api/v1/community_directory/settings/${categoryKey}`, data).then(response => {
    dispatch({ type: COMMUNITY_DIR_SETTING_SAVE_SUCCESS, setting: response.data });
    return response.data;
  });
