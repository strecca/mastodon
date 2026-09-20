// actions/community_listings.js

import api from "../api";

// ── Action types ───────────────────────────────────────────────────────────────

export const LISTINGS_FETCH_REQUEST = "COMMUNITY_LISTINGS/FETCH_REQUEST";
export const LISTINGS_FETCH_SUCCESS = "COMMUNITY_LISTINGS/FETCH_SUCCESS";
export const LISTINGS_FETCH_FAIL = "COMMUNITY_LISTINGS/FETCH_FAIL";

export const LISTING_FETCH_SUCCESS = "COMMUNITY_LISTINGS/LISTING_FETCH_SUCCESS";
export const LISTING_CREATE_SUCCESS = "COMMUNITY_LISTINGS/CREATE_SUCCESS";
export const LISTING_UPDATE_SUCCESS = "COMMUNITY_LISTINGS/UPDATE_SUCCESS";
export const LISTING_DELETE_SUCCESS = "COMMUNITY_LISTINGS/DELETE_SUCCESS";
export const LISTING_FULFILL_SUCCESS = "COMMUNITY_LISTINGS/FULFILL_SUCCESS";
export const LISTING_CLOSE_SUCCESS = "COMMUNITY_LISTINGS/CLOSE_SUCCESS";
export const LISTING_INTEREST_ADD = "COMMUNITY_LISTINGS/INTEREST_ADD";
export const LISTING_INTEREST_REMOVE = "COMMUNITY_LISTINGS/INTEREST_REMOVE";

// ── List ───────────────────────────────────────────────────────────────────────

// Fetches all listings unfiltered, always from the server. The list page shows
// what is already loaded straight away and calls this to bring it up to date.
export const refreshListings = () => (dispatch) => {
  dispatch({ type: LISTINGS_FETCH_REQUEST });
  return api()
    .get("/api/v1/community_listings")
    .then((res) => dispatch({ type: LISTINGS_FETCH_SUCCESS, listings: res.data }))
    .catch((err) => dispatch({ type: LISTINGS_FETCH_FAIL, error: err }));
};

// ── Detail ─────────────────────────────────────────────────────────────────────

export const fetchListing = (id) => (dispatch, getState) => {
  if (getState().getIn(["community_listings", "byId", String(id)])) return Promise.resolve();

  return api()
    .get(`/api/v1/community_listings/${id}`)
    .then((res) => dispatch({ type: LISTING_FETCH_SUCCESS, listing: res.data }));
};

// Re-fetch a listing that is already on screen, in place. A 404 means the
// owner deleted it, so drop it from the store and the page shows "not found".
export const revalidateListing = (id) => (dispatch) =>
  api()
    .get(`/api/v1/community_listings/${id}`)
    .then((res) => dispatch({ type: LISTING_FETCH_SUCCESS, listing: res.data }))
    .catch((err) => {
      if (err?.response?.status === 404) {
        dispatch({ type: LISTING_DELETE_SUCCESS, id: String(id) });
      }
    });

// Force-fetch a single listing (used after interest queue actions)
export const refreshListing = (id) => (dispatch) =>
  api()
    .get(`/api/v1/community_listings/${id}`)
    .then((res) => dispatch({ type: LISTING_FETCH_SUCCESS, listing: res.data }));

// ── CRUD ───────────────────────────────────────────────────────────────────────

export const createListing = (formData) => (dispatch) =>
  api()
    .post("/api/v1/community_listings", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => {
      dispatch({ type: LISTING_CREATE_SUCCESS, listing: res.data });
      return res.data;
    });

export const updateListing = (id, formData) => (dispatch) =>
  api()
    .put(`/api/v1/community_listings/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => {
      dispatch({ type: LISTING_UPDATE_SUCCESS, listing: res.data });
      return res.data;
    });

export const deleteListing = (id) => (dispatch) =>
  api()
    .delete(`/api/v1/community_listings/${id}`)
    .then(() => dispatch({ type: LISTING_DELETE_SUCCESS, id: String(id) }));

export const fulfillListing = (id) => (dispatch) =>
  api()
    .post(`/api/v1/community_listings/${id}/fulfill`)
    .then((res) => dispatch({ type: LISTING_FULFILL_SUCCESS, listing: res.data }));

export const closeListing = (id) => (dispatch) =>
  api()
    .post(`/api/v1/community_listings/${id}/close`)
    .then((res) => dispatch({ type: LISTING_CLOSE_SUCCESS, listing: res.data }));

// ── Interests ──────────────────────────────────────────────────────────────────

export const addInterest = (listingId, message) => (dispatch) =>
  api()
    .post(`/api/v1/community_listings/${listingId}/interests`, { message })
    .then(() => dispatch({ type: LISTING_INTEREST_ADD, id: String(listingId) }));

export const removeInterest = (listingId) => (dispatch) =>
  api()
    .delete(`/api/v1/community_listings/${listingId}/interests`)
    .then(() => dispatch({ type: LISTING_INTEREST_REMOVE, id: String(listingId) }));
