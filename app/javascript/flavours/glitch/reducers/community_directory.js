// app/javascript/flavours/glitch/reducers/community_directory.js

import { Map as ImmutableMap, List as ImmutableList, fromJS } from 'immutable';

import {
  COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST,
  COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS,
  COMMUNITY_DIR_CATEGORIES_FETCH_FAIL,
  COMMUNITY_DIR_GENERATE_REQUEST,
  COMMUNITY_DIR_GENERATE_SUCCESS,
  COMMUNITY_DIR_GENERATE_FAIL,
  COMMUNITY_DIR_MODERATION_FETCH_REQUEST,
  COMMUNITY_DIR_MODERATION_FETCH_SUCCESS,
  COMMUNITY_DIR_MODERATION_FETCH_FAIL,
  COMMUNITY_DIR_MODERATION_ENTRY_REMOVED,
  COMMUNITY_DIR_PERMISSIONS_FETCH_REQUEST,
  COMMUNITY_DIR_PERMISSIONS_FETCH_SUCCESS,
  COMMUNITY_DIR_PERMISSIONS_FETCH_FAIL,
  COMMUNITY_DIR_PERMISSION_SAVE_SUCCESS,
  COMMUNITY_DIR_PERMISSION_DELETE_SUCCESS,
  COMMUNITY_DIR_SETTINGS_FETCH_REQUEST,
  COMMUNITY_DIR_SETTINGS_FETCH_SUCCESS,
  COMMUNITY_DIR_SETTINGS_FETCH_FAIL,
  COMMUNITY_DIR_SETTING_SAVE_SUCCESS,
} from '../actions/community_directory';

const initialState = ImmutableMap({
  categories:       ImmutableList(),
  categoriesLoading: false,
  categoriesError:  null,
  generating:       false,
  generationResult: null,
  generationError:  null,
  moderation:        ImmutableList(),
  moderationLoading: false,
  moderationError:   null,
  permissions:        ImmutableList(),
  permissionsLoading: false,
  permissionsError:   null,
  settings:        ImmutableList(),
  settingsLoading: false,
  settingsError:   null,
});

export default function communityDirectoryReducer(state = initialState, action) {
  switch (action.type) {

  // ── Categories ──────────────────────────────────────────────
  case COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST:
    return state.set('categoriesLoading', true).set('categoriesError', null);
  case COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS:
    return state.set('categories', fromJS(action.categories)).set('categoriesLoading', false);
  case COMMUNITY_DIR_CATEGORIES_FETCH_FAIL:
    return state.set('categoriesLoading', false).set('categoriesError', action.error?.message || 'Failed');

  // ── Generate ────────────────────────────────────────────────
  case COMMUNITY_DIR_GENERATE_REQUEST:
    return state.set('generating', true).set('generationResult', null).set('generationError', null);
  case COMMUNITY_DIR_GENERATE_SUCCESS:
    return state.set('generating', false).set('generationResult', fromJS(action.result));
  case COMMUNITY_DIR_GENERATE_FAIL:
    return state.set('generating', false).set('generationError', action.error?.message || 'Generation failed');

  // ── Moderation ──────────────────────────────────────────────
  case COMMUNITY_DIR_MODERATION_FETCH_REQUEST:
    return state.set('moderationLoading', true).set('moderationError', null);
  case COMMUNITY_DIR_MODERATION_FETCH_SUCCESS:
    return state.set('moderation', fromJS(action.entries)).set('moderationLoading', false);
  case COMMUNITY_DIR_MODERATION_FETCH_FAIL:
    return state.set('moderationLoading', false).set('moderationError', action.error?.message || 'Failed');
  case COMMUNITY_DIR_MODERATION_ENTRY_REMOVED:
    return state.update('moderation', list =>
      list.filter(e => !(e.get('id') === action.entryId && e.get('category_key') === action.categoryKey))
    );

  // ── Permissions ─────────────────────────────────────────────
  case COMMUNITY_DIR_PERMISSIONS_FETCH_REQUEST:
    return state.set('permissionsLoading', true).set('permissionsError', null);
  case COMMUNITY_DIR_PERMISSIONS_FETCH_SUCCESS:
    return state.set('permissions', fromJS(action.permissions)).set('permissionsLoading', false);
  case COMMUNITY_DIR_PERMISSIONS_FETCH_FAIL:
    return state.set('permissionsLoading', false).set('permissionsError', action.error?.message || 'Failed');
  case COMMUNITY_DIR_PERMISSION_SAVE_SUCCESS: {
    const incoming = fromJS(action.permission);
    const idx = state.get('permissions').findIndex(p => p.get('id') === incoming.get('id'));
    return idx >= 0
      ? state.setIn(['permissions', idx], incoming)
      : state.update('permissions', list => list.push(incoming));
  }
  case COMMUNITY_DIR_PERMISSION_DELETE_SUCCESS:
    return state.update('permissions', list => list.filter(p => p.get('id') !== action.id));

  // ── Settings ────────────────────────────────────────────────
  case COMMUNITY_DIR_SETTINGS_FETCH_REQUEST:
    return state.set('settingsLoading', true).set('settingsError', null);
  case COMMUNITY_DIR_SETTINGS_FETCH_SUCCESS:
    return state.set('settings', fromJS(action.settings)).set('settingsLoading', false);
  case COMMUNITY_DIR_SETTINGS_FETCH_FAIL:
    return state.set('settingsLoading', false).set('settingsError', action.error?.message || 'Failed');
  case COMMUNITY_DIR_SETTING_SAVE_SUCCESS: {
    const incoming = fromJS(action.setting);
    const idx = state.get('settings').findIndex(s => s.get('category_key') === incoming.get('category_key'));
    return idx >= 0
      ? state.setIn(['settings', idx], incoming)
      : state.update('settings', list => list.push(incoming));
  }

  default:
    return state;
  }
}
