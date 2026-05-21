// reducers/community_visits.js
// State for the "When I'll Be In Town" calendar feature.

import { Map as ImmutableMap, List as ImmutableList, fromJS } from 'immutable';

import {
  VISITS_FETCH_REQUEST,
  VISITS_FETCH_SUCCESS,
  VISITS_FETCH_FAIL,
  VISITS_MINE_SUCCESS,
  VISITS_HEATMAP_SUCCESS,
  VISIT_CREATE_SUCCESS,
  VISIT_UPDATE_SUCCESS,
  VISIT_DELETE_SUCCESS,
  NOTIF_PREFS_SUCCESS,
  NOTIF_PREFS_UPDATE_SUCCESS,
  VISIT_NOTIFS_SUCCESS,
  VISIT_NOTIFS_UNREAD,
  VISIT_NOTIF_READ,
  VISIT_NOTIFS_READ_ALL,
} from '../actions/community_visits';

const initialState = ImmutableMap({
  // Calendar window visits (reloaded per month)
  visits:        ImmutableList(),
  loading:       false,
  error:         null,

  // Current user's own visits across 18-month window
  myVisits:       ImmutableList(),
  myVisitsLoaded: false,

  // Monthly visit counts for the public heatmap teaser
  heatmap:        ImmutableMap(),

  // Notification preferences
  notifPrefs:       ImmutableMap(),
  notifPrefsLoaded: false,

  // Notifications inbox
  notifications: ImmutableList(),
  notifPage:     1,
  notifPages:    1,
  unreadCount:   0,
});

export default function communityVisitsReducer(state = initialState, action) {
  switch (action.type) {

  // ── Calendar fetch ────────────────────────────────────────────────────────

  case VISITS_FETCH_REQUEST:
    return state.set('loading', true).set('error', null);

  case VISITS_FETCH_SUCCESS:
    return state.set('loading', false).set('visits', fromJS(action.visits));

  case VISITS_FETCH_FAIL:
    return state.set('loading', false)
                .set('error', action.error?.message || 'Failed to load visits');

  // ── Own visits ────────────────────────────────────────────────────────────

  case VISITS_MINE_SUCCESS:
    return state.set('myVisits', fromJS(action.visits)).set('myVisitsLoaded', true);

  // ── Heatmap ───────────────────────────────────────────────────────────────

  case VISITS_HEATMAP_SUCCESS:
    return state.set('heatmap', fromJS(action.heatmap));

  // ── CRUD ──────────────────────────────────────────────────────────────────

  case VISIT_CREATE_SUCCESS: {
    const created = fromJS(action.visit);
    return state
      .update('visits',   l => l.push(created))
      .update('myVisits', l => l.push(created));
  }

  case VISIT_UPDATE_SUCCESS: {
    const updated = fromJS(action.visit);
    const replaceById = list => list.map(v => v.get('id') === updated.get('id') ? updated : v);
    return state
      .update('visits',   replaceById)
      .update('myVisits', replaceById);
  }

  case VISIT_DELETE_SUCCESS:
    return state
      .update('visits',   l => l.filter(v => v.get('id') !== action.id))
      .update('myVisits', l => l.filter(v => v.get('id') !== action.id));

  // ── Notification preferences ──────────────────────────────────────────────

  case NOTIF_PREFS_SUCCESS:
  case NOTIF_PREFS_UPDATE_SUCCESS:
    return state.set('notifPrefs', fromJS(action.prefs)).set('notifPrefsLoaded', true);

  // ── Notifications inbox ───────────────────────────────────────────────────

  case VISIT_NOTIFS_SUCCESS:
    return state
      .set('notifications', fromJS(action.notifications))
      .set('notifPage',  action.page  || 1)
      .set('notifPages', action.pages || 1)
      .set('unreadCount', action.unread_count || 0);

  case VISIT_NOTIFS_UNREAD:
    return state.set('unreadCount', action.count);

  case VISIT_NOTIF_READ: {
    const updated = fromJS(action.notification);
    return state
      .update('notifications', l => l.map(n => n.get('id') === updated.get('id') ? updated : n))
      .update('unreadCount', c => Math.max(0, c - 1));
  }

  case VISIT_NOTIFS_READ_ALL:
    return state
      .update('notifications', l => l.map(n => n.set('read', true)))
      .set('unreadCount', 0);

  default:
    return state;
  }
}
