import type { PropsWithChildren } from "react";
import type React from "react";

import type { useLocation } from "react-router";
import { Router as OriginalRouter, useHistory } from "react-router";

import type { LocationDescriptor, LocationDescriptorObject, Path } from "history";
import { createBrowserHistory, parsePath } from "history";

import { layoutFromWindow } from "flavours/glitch/is_mobile";
import { isDevelopment } from "flavours/glitch/utils/environment";

import type { FocusTarget } from "./navigation_focus_target";

interface MastodonLocationState {
  fromMastodon?: boolean;
  mastodonModalKey?: string;
  // Controls which element is focused after a navigation.
  // Set to `false` to prevent navigation focus.
  focusTarget?: FocusTarget;
  // Prevent the rightmost column in advanced UI from scrolling
  // into view on location changes
  preventMultiColumnAutoScroll?: string;
}

export type LocationState = MastodonLocationState | null | undefined;

export type MastodonLocation = ReturnType<typeof useLocation<LocationState>>;

export type MastodonLocationDescriptor = LocationDescriptor<LocationState>;

type HistoryPath = Path | LocationDescriptor<LocationState>;

export const browserHistory = createBrowserHistory<LocationState>();
const originalPush = browserHistory.push.bind(browserHistory);
const originalReplace = browserHistory.replace.bind(browserHistory);

export function useAppHistory() {
  return useHistory<LocationState>();
}

function normalizePath(
  path: HistoryPath,
  state?: LocationState,
): LocationDescriptorObject<LocationState> {
  // parsePath, not { pathname: path }: a plain string path can carry a hash
  // or query string (e.g. "/landing#fd-board"), and history's push/replace
  // don't re-split an object-form pathname field that still has one baked
  // in -- react-router's own location state ends up with the raw
  // "/landing#fd-board" as its pathname (matching no route, 404) even
  // though window.location itself parses it correctly, which is what made
  // this so confusing to track down. Confirmed live 2026-09-24.
  // @types/history's parsePath() return type claims a `state` field that it
  // never actually sets (confirmed at runtime) -- both branches cast to our
  // own location type rather than history's loosely-typed one.
  const location: LocationDescriptorObject<LocationState> =
    typeof path === "string"
      ? ({ ...parsePath(path) } as LocationDescriptorObject<LocationState>)
      : ({ ...path } as LocationDescriptorObject<LocationState>);

  if (location.state === undefined && state !== undefined) {
    location.state = state;
  } else if (location.state !== undefined && state !== undefined && isDevelopment()) {
    // eslint-disable-next-line no-console
    console.log(
      "You should avoid providing a 2nd state argument to push when the 1st argument is a location-like object that already has state; it is ignored",
    );
  }

  if (
    layoutFromWindow() === "multi-column" &&
    location.pathname &&
    !location.pathname.startsWith("/deck")
  ) {
    location.pathname = `/deck${location.pathname}`;
  }

  return location;
}

browserHistory.push = (path: HistoryPath, state?: MastodonLocationState) => {
  const location = normalizePath(path, state);

  location.state = location.state ?? {};
  location.state.fromMastodon = true;

  originalPush(location);
};

browserHistory.replace = (path: HistoryPath, state?: MastodonLocationState) => {
  const location = normalizePath(path, state);

  if (!location.pathname) return;

  if (browserHistory.location.state?.fromMastodon) {
    location.state = location.state ?? {};
    location.state.fromMastodon = true;
  }

  originalReplace(location);
};

export const Router: React.FC<PropsWithChildren> = ({ children }) => {
  return <OriginalRouter history={browserHistory}>{children}</OriginalRouter>;
};
