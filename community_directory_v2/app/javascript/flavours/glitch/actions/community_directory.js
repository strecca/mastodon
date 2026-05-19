// app/javascript/flavours/glitch/actions/community_directory.js
//
// Actions for the admin scaffolding tool itself (not the generated features).

import api from '../api';

export const COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST = 'COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST';
export const COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS = 'COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS';
export const COMMUNITY_DIR_CATEGORIES_FETCH_FAIL    = 'COMMUNITY_DIR_CATEGORIES_FETCH_FAIL';

export const COMMUNITY_DIR_GENERATE_REQUEST = 'COMMUNITY_DIR_GENERATE_REQUEST';
export const COMMUNITY_DIR_GENERATE_SUCCESS = 'COMMUNITY_DIR_GENERATE_SUCCESS';
export const COMMUNITY_DIR_GENERATE_FAIL    = 'COMMUNITY_DIR_GENERATE_FAIL';

export const fetchCategories = () => (dispatch) => {
  dispatch({ type: COMMUNITY_DIR_CATEGORIES_FETCH_REQUEST });

  api().get('/api/v1/community_directory/categories').then(response => {
    dispatch({
      type: COMMUNITY_DIR_CATEGORIES_FETCH_SUCCESS,
      categories: response.data,
    });
  }).catch(error => {
    dispatch({ type: COMMUNITY_DIR_CATEGORIES_FETCH_FAIL, error, skipAlert: true });
  });
};

export const generateCategory = (config) => (dispatch) => {
  dispatch({ type: COMMUNITY_DIR_GENERATE_REQUEST });

  return api().post('/api/v1/community_directory/generate', config).then(response => {
    dispatch({
      type: COMMUNITY_DIR_GENERATE_SUCCESS,
      result: response.data,
    });
    return response.data;
  }).catch(error => {
    dispatch({ type: COMMUNITY_DIR_GENERATE_FAIL, error });
    throw error;
  });
};
