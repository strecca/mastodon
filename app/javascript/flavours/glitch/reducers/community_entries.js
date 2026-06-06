// app/javascript/flavours/glitch/reducers/community_entries.js
//
// Single reducer that handles state for ALL community directory categories.
// State shape: ImmutableMap keyed by categoryKey, each containing:
//   { entries: List, entriesLoading: bool, currentEntry: Map|null,
//     currentEntryLoading: bool, total: number, page: number, pages: number, error: string|null }

import { Map as ImmutableMap, List as ImmutableList, fromJS } from 'immutable';

const emptyCategoryState = ImmutableMap({
  entries: ImmutableList(),
  entriesLoading: false,
  currentEntry: null,
  currentEntryLoading: false,
  total: 0,
  page: 1,
  pages: 1,
  error: null,
});

const initialState = ImmutableMap();

// All community entry action types follow the pattern:
// COMMUNITY_ENTRIES/{categoryKey}/{ACTION}
const PREFIX = 'COMMUNITY_ENTRIES/';

function getCategoryAndAction(type) {
  if (!type || !type.startsWith(PREFIX)) return null;
  const rest = type.slice(PREFIX.length);
  const slashIdx = rest.indexOf('/');
  if (slashIdx === -1) return null;
  return {
    categoryKey: rest.slice(0, slashIdx),
    action: rest.slice(slashIdx + 1),
  };
}

export default function communityEntriesReducer(state = initialState, action) {
  const parsed = getCategoryAndAction(action.type);
  if (!parsed) return state;

  const { categoryKey, action: act } = parsed;

  // Ensure category sub-state exists
  if (!state.has(categoryKey)) {
    state = state.set(categoryKey, emptyCategoryState);
  }

  switch (act) {
  // ── List ──────────────────────────────────────────────
  case 'FETCH_REQUEST':
    return state.setIn([categoryKey, 'entriesLoading'], true)
                .setIn([categoryKey, 'error'], null);

  case 'FETCH_SUCCESS':
    return state.withMutations(s => {
      s.setIn([categoryKey, 'entries'], fromJS(action.entries));
      s.setIn([categoryKey, 'entriesLoading'], false);
      s.setIn([categoryKey, 'total'], action.total || 0);
      s.setIn([categoryKey, 'page'], action.page || 1);
      s.setIn([categoryKey, 'pages'], action.pages || 1);
      s.setIn([categoryKey, 'error'], null);
    });

  case 'FETCH_FAIL': {
    const status = action.error?.response?.status;
    const msg    = status ? `Server error ${status} — check logs` : (action.error?.message || 'Failed to load entries');
    return state.setIn([categoryKey, 'entriesLoading'], false)
                .setIn([categoryKey, 'error'], msg);
  }

  // ── Single entry ─────────────────────────────────────
  case 'FETCH_ONE_REQUEST':
    return state.setIn([categoryKey, 'currentEntryLoading'], true)
                .setIn([categoryKey, 'currentEntry'], null)
                .setIn([categoryKey, 'error'], null);

  case 'FETCH_ONE_SUCCESS':
    return state.setIn([categoryKey, 'currentEntry'], fromJS(action.entry))
                .setIn([categoryKey, 'currentEntryLoading'], false);

  case 'FETCH_ONE_FAIL':
    return state.setIn([categoryKey, 'currentEntryLoading'], false)
                .setIn([categoryKey, 'error'], action.error?.message || 'Failed to load entry');

  case 'CLEAR_CURRENT':
    return state.setIn([categoryKey, 'currentEntry'], null)
                .setIn([categoryKey, 'currentEntryLoading'], false);

  // ── Create ───────────────────────────────────────────
  case 'CREATE_SUCCESS':
    return state.updateIn([categoryKey, 'entries'], list =>
      list.unshift(fromJS(action.entry)),
    );

  // ── Update ───────────────────────────────────────────
  case 'UPDATE_SUCCESS': {
    const updated = fromJS(action.entry);
    const idx = state.getIn([categoryKey, 'entries'])
                     .findIndex(e => e.get('id') === updated.get('id'));
    return state.withMutations(s => {
      if (idx > -1) s.setIn([categoryKey, 'entries', idx], updated);
      if (s.getIn([categoryKey, 'currentEntry', 'id']) === updated.get('id')) {
        s.setIn([categoryKey, 'currentEntry'], updated);
      }
    });
  }

  // ── Delete ───────────────────────────────────────────
  case 'DELETE_SUCCESS':
    return state.updateIn([categoryKey, 'entries'], list =>
      list.filter(e => e.get('id') !== action.id),
    );

  default:
    return state;
  }
}
