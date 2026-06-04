// reducers/community_listings.js

import { Map as ImmutableMap, List as ImmutableList, fromJS } from 'immutable';

import {
  LISTINGS_FETCH_REQUEST,
  LISTINGS_FETCH_SUCCESS,
  LISTINGS_FETCH_FAIL,
  LISTING_FETCH_SUCCESS,
  LISTING_CREATE_SUCCESS,
  LISTING_UPDATE_SUCCESS,
  LISTING_DELETE_SUCCESS,
  LISTING_FULFILL_SUCCESS,
  LISTING_CLOSE_SUCCESS,
  LISTING_INTEREST_ADD,
  LISTING_INTEREST_REMOVE,
} from '../actions/community_listings';

const initialState = ImmutableMap({
  // Full unfiltered list — filtered client-side
  items:   ImmutableList(),
  loaded:  false,
  loading: false,
  error:   null,

  // Per-ID detail cache (includes interests array for owners)
  byId:    ImmutableMap(),
});

const upsertById = (state, listing) => {
  const key = String(listing.id);
  return state.setIn(['byId', key], fromJS(listing));
};

const replaceInItems = (state, listing) => {
  const key = String(listing.id);
  return state.update('items', list =>
    list.map(item => String(item.get('id')) === key ? fromJS(listing) : item)
  );
};

export default function communityListingsReducer(state = initialState, action) {
  switch (action.type) {

  case LISTINGS_FETCH_REQUEST:
    return state.set('loading', true).set('error', null);

  case LISTINGS_FETCH_SUCCESS:
    return state
      .set('loading', false)
      .set('loaded', true)
      .set('items', fromJS(action.listings));

  case LISTINGS_FETCH_FAIL:
    return state.set('loading', false)
                .set('error', action.error?.message || 'Failed to load listings');

  case LISTING_FETCH_SUCCESS:
    return upsertById(state, action.listing);

  case LISTING_CREATE_SUCCESS: {
    const created = fromJS(action.listing);
    return state
      .update('items', list => list.unshift(created))
      .setIn(['byId', String(action.listing.id)], created);
  }

  case LISTING_UPDATE_SUCCESS:
  case LISTING_FULFILL_SUCCESS:
  case LISTING_CLOSE_SUCCESS:
    return replaceInItems(upsertById(state, action.listing), action.listing);

  case LISTING_DELETE_SUCCESS:
    return state
      .update('items', list => list.filter(item => String(item.get('id')) !== action.id))
      .deleteIn(['byId', action.id]);

  case LISTING_INTEREST_ADD: {
    const key = action.id;
    return state
      .updateIn(['byId', key, 'interest_count'], c => (c || 0) + 1)
      .setIn(['byId', key, 'interested'], true)
      .update('items', list =>
        list.map(item =>
          String(item.get('id')) === key
            ? item.update('interest_count', c => (c || 0) + 1).set('interested', true)
            : item
        )
      );
  }

  case LISTING_INTEREST_REMOVE: {
    const key = action.id;
    return state
      .updateIn(['byId', key, 'interest_count'], c => Math.max(0, (c || 1) - 1))
      .setIn(['byId', key, 'interested'], false)
      .update('items', list =>
        list.map(item =>
          String(item.get('id')) === key
            ? item.update('interest_count', c => Math.max(0, (c || 1) - 1)).set('interested', false)
            : item
        )
      );
  }

  default:
    return state;
  }
}
