import { createSlice } from '@reduxjs/toolkit';

import { openModal } from 'flavours/glitch/actions/modal';
import type { ApiWelcomeDigestState } from 'flavours/glitch/api/member_welcome_digest';
import {
  apiGetWelcomeDigest,
  apiMarkWelcomeDigestRead,
} from 'flavours/glitch/api/member_welcome_digest';
import {
  createAppThunk,
  createDataLoadingThunk,
} from 'flavours/glitch/store/typed_functions';

interface WelcomeDigestState {
  state?: ApiWelcomeDigestState;
  checked: boolean;
}

const welcomeDigestSlice = createSlice({
  name: 'welcomeDigest',
  initialState: { checked: false } as WelcomeDigestState,
  reducers: {},
  extraReducers(builder) {
    builder.addCase(fetchWelcomeDigest.fulfilled, (state, action) => {
      state.state = action.payload;
      state.checked = true;
    });
  },
});

export const welcomeDigest = welcomeDigestSlice.reducer;

// Called once on initial load. Never triggers generation — that's enqueued
// server-side from the sign-in throttle (UserTrackingConcern), at most once
// per member per day — this only ever reads today's state, and dispatches
// the popup if a digest is already sitting there waiting.
export const checkWelcomeDigest = createAppThunk(
  `${welcomeDigestSlice.name}/checkWelcomeDigest`,
  (_arg: unknown, { dispatch, getState }) => {
    const { checked } = getState().welcomeDigest;
    if (checked) return;
    void dispatch(fetchWelcomeDigest());
  },
);

const fetchWelcomeDigest = createDataLoadingThunk(
  `${welcomeDigestSlice.name}/fetchWelcomeDigest`,
  async () => apiGetWelcomeDigest(),
  ({ state, content, refresh }, { dispatch }) => {
    if (state === 'generating' && refresh) {
      // Same poll-while-generating pattern as annual_report's fetchReportState.
      window.setTimeout(() => {
        void dispatch(fetchWelcomeDigest());
      }, 1_000 * refresh.retry);
    } else if (state === 'available' && content) {
      dispatch(
        openModal({
          modalType: 'WELCOME_DIGEST',
          modalProps: { content },
        }),
      );
    }

    return state;
  },
  { useLoadingBar: false },
);

// Fire-and-forget — marks today's digest viewed once the popup is actually
// shown and dismissed. Not called on fetch, since a poll that never renders
// shouldn't count as viewed.
export const markWelcomeDigestRead = createAppThunk(
  `${welcomeDigestSlice.name}/markWelcomeDigestRead`,
  () => {
    void apiMarkWelcomeDigestRead();
  },
);
