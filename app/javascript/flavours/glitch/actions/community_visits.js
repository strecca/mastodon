// actions/community_visits.js
// Redux action creators for the "When I'll Be In Town" calendar feature.

import api from '../api';

// ── Action types ───────────────────────────────────────────────────────────

export const VISITS_FETCH_REQUEST = 'COMMUNITY_VISITS/FETCH_REQUEST';
export const VISITS_FETCH_SUCCESS = 'COMMUNITY_VISITS/FETCH_SUCCESS';
export const VISITS_FETCH_FAIL    = 'COMMUNITY_VISITS/FETCH_FAIL';

export const VISITS_MINE_SUCCESS    = 'COMMUNITY_VISITS/MINE_SUCCESS';
export const VISITS_HEATMAP_SUCCESS = 'COMMUNITY_VISITS/HEATMAP_SUCCESS';

export const VISIT_CREATE_SUCCESS = 'COMMUNITY_VISITS/CREATE_SUCCESS';
export const VISIT_UPDATE_SUCCESS = 'COMMUNITY_VISITS/UPDATE_SUCCESS';
export const VISIT_DELETE_SUCCESS = 'COMMUNITY_VISITS/DELETE_SUCCESS';

export const NOTIF_PREFS_SUCCESS        = 'COMMUNITY_VISITS/NOTIF_PREFS_SUCCESS';
export const NOTIF_PREFS_UPDATE_SUCCESS = 'COMMUNITY_VISITS/NOTIF_PREFS_UPDATE_SUCCESS';

export const VISIT_NOTIFS_SUCCESS  = 'COMMUNITY_VISITS/NOTIFS_SUCCESS';
export const VISIT_NOTIFS_UNREAD   = 'COMMUNITY_VISITS/NOTIFS_UNREAD';
export const VISIT_NOTIF_READ      = 'COMMUNITY_VISITS/NOTIF_READ';
export const VISIT_NOTIFS_READ_ALL = 'COMMUNITY_VISITS/NOTIFS_READ_ALL';

// ── Calendar range ─────────────────────────────────────────────────────────

// from / to: ISO date strings "YYYY-MM-DD"
export const fetchVisits = (from, to) => (dispatch) => {
  dispatch({ type: VISITS_FETCH_REQUEST });
  return api().get('/api/v1/community_visits', { params: { from, to } })
    .then(res => dispatch({ type: VISITS_FETCH_SUCCESS, visits: res.data }))
    .catch(err => dispatch({ type: VISITS_FETCH_FAIL, error: err }));
};

// ── Own visits (18-month window) ───────────────────────────────────────────

export const fetchMyVisits = () => (dispatch) =>
  api().get('/api/v1/community_visits/mine')
    .then(res => dispatch({ type: VISITS_MINE_SUCCESS, visits: res.data }));

// ── Public heatmap (no auth required) ─────────────────────────────────────

export const fetchHeatmap = () => (dispatch) =>
  api().get('/api/v1/community_visits/heatmap')
    .then(res => dispatch({ type: VISITS_HEATMAP_SUCCESS, heatmap: res.data }));

// ── CRUD ───────────────────────────────────────────────────────────────────

export const createVisit = (visitData, availabilities) => (dispatch) =>
  api().post('/api/v1/community_visits', { visit: visitData, availabilities })
    .then(res => {
      dispatch({ type: VISIT_CREATE_SUCCESS, visit: res.data });
      return res.data;
    });

export const updateVisit = (id, visitData, availabilities) => (dispatch) =>
  api().put(`/api/v1/community_visits/${id}`, { visit: visitData, availabilities })
    .then(res => {
      dispatch({ type: VISIT_UPDATE_SUCCESS, visit: res.data });
      return res.data;
    });

export const deleteVisit = (id) => (dispatch) =>
  api().delete(`/api/v1/community_visits/${id}`)
    .then(() => dispatch({ type: VISIT_DELETE_SUCCESS, id }));

// ── Notify friends ─────────────────────────────────────────────────────────

export const notifyFriends = (visitId, accountIds, message) => () =>
  api().post(`/api/v1/community_visits/${visitId}/notify_friends`, {
    account_ids: accountIds,
    message,
  });

// ── Notification preferences ───────────────────────────────────────────────

export const fetchNotifPrefs = () => (dispatch) =>
  api().get('/api/v1/community_notification_preferences')
    .then(res => dispatch({ type: NOTIF_PREFS_SUCCESS, prefs: res.data }));

export const updateNotifPrefs = (prefs) => (dispatch) =>
  api().put('/api/v1/community_notification_preferences', prefs)
    .then(res => dispatch({ type: NOTIF_PREFS_UPDATE_SUCCESS, prefs: res.data }));

// ── Notifications inbox ────────────────────────────────────────────────────

export const fetchVisitNotifications = (page = 1) => (dispatch) =>
  api().get('/api/v1/community_visit_notifications', { params: { page } })
    .then(res => dispatch({ type: VISIT_NOTIFS_SUCCESS, ...res.data }));

export const fetchUnreadCount = () => (dispatch) =>
  api().get('/api/v1/community_visit_notifications/unread_count')
    .then(res => dispatch({ type: VISIT_NOTIFS_UNREAD, count: res.data.count }));

export const markNotificationRead = (id) => (dispatch) =>
  api().post(`/api/v1/community_visit_notifications/${id}/read`)
    .then(res => dispatch({ type: VISIT_NOTIF_READ, notification: res.data }));

export const markAllNotificationsRead = () => (dispatch) =>
  api().post('/api/v1/community_visit_notifications/read_all')
    .then(() => dispatch({ type: VISIT_NOTIFS_READ_ALL }));
