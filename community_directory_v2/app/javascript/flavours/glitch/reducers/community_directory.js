// app/javascript/flavours/glitch/reducers/community_directory.js
//
// Reducer for the admin scaffolding tool's own state.
// Stores the list of existing generated categories and generation results.

import { Map as ImmutableMap, List as ImmutableList, fromJS } from 'immutable';

import {
  COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST,
  COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS,
  COMMUNITY_DIR_CATEGORIES_FETCH_FAIL,
  COMMUNITY_DIR_GENERATE_REQUEST,
  COMMUNITY_DIR_GENERATE_SUCCESS,
  COMMUNITY_DIR_GENERATE_FAIL,
} from '../actions/community_directory';

const initialState = ImmutableMap({
  categories: ImmutableList(),
  categoriesLoading: false,
  categoriesError: null,
  generating: false,
  generationResult: null,
  generationError: null,
});

export default function communityDirectoryReducer(state = initialState, action) {
  switch (action.type) {
  case COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST:
    return state.set('categoriesLoading', true).set('categoriesError', null);

  case COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS:
    return state.set('categories', fromJS(action.categories))
                .set('categoriesLoading', false);

  case COMMUNITY_DIR_CATEGORIES_FETCH_FAIL:
    return state.set('categoriesLoading', false)
                .set('categoriesError', action.error?.message || 'Failed to load categories');

  case COMMUNITY_DIR_GENERATE_REQUEST:
    return state.set('generating', true)
                .set('generationResult', null)
                .set('generationError', null);

  case COMMUNITY_DIR_GENERATE_SUCCESS:
    return state.set('generating', false)
                .set('generationResult', fromJS(action.result));

  case COMMUNITY_DIR_GENERATE_FAIL:
    return state.set('generating', false)
                .set('generationError', action.error?.message || 'Generation failed');

  default:
    return state;
  }
}
