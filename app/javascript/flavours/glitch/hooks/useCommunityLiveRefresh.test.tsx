import { renderHook } from "@testing-library/react";

import { useCommunityLiveRefresh } from "./useCommunityLiveRefresh";

interface Callbacks {
  onConnect: () => void;
  onDisconnect: () => void;
  onReceive: (data: { event: string }) => void;
}

const mocks = vi.hoisted(() => ({
  signedIn: false,
  callbacks: null as Callbacks | null,
  channel: null as string | null,
  disconnect: vi.fn(),
  dispatch: vi.fn((thunk: () => unknown) => thunk()),
}));

vi.mock("flavours/glitch/identity_context", () => ({
  useIdentity: () => ({ signedIn: mocks.signedIn }),
}));

vi.mock("flavours/glitch/store", () => ({
  useAppDispatch: () => mocks.dispatch,
}));

vi.mock("flavours/glitch/stream", () => ({
  connectStream: (channel: string, _params: object, make: () => Callbacks) => () => {
    mocks.channel = channel;
    mocks.callbacks = make();
    return mocks.disconnect;
  },
}));

const becomeVisible = () => {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("useCommunityLiveRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T12:00:00Z"));
    mocks.signedIn = false;
    mocks.callbacks = null;
    mocks.channel = null;
    mocks.disconnect.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes when the app returns to the foreground, for signed-out visitors too", () => {
    const refresh = vi.fn();
    renderHook(() => {
      useCommunityLiveRefresh("listings", refresh);
    });

    vi.advanceTimersByTime(60_000);
    becomeVisible();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mocks.callbacks).toBeNull();
  });

  it("does not refresh again within 15 seconds of the last refresh", () => {
    const refresh = vi.fn();
    renderHook(() => {
      useCommunityLiveRefresh("listings", refresh);
    });

    vi.advanceTimersByTime(60_000);
    becomeVisible();
    vi.advanceTimersByTime(5_000);
    becomeVisible();

    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20_000);
    becomeVisible();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("does not refresh right after the page has just loaded its own data", () => {
    const refresh = vi.fn();
    renderHook(() => {
      useCommunityLiveRefresh("listings", refresh);
    });

    becomeVisible();

    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes at once when the server pushes a refresh", () => {
    mocks.signedIn = true;
    const refresh = vi.fn();
    renderHook(() => {
      useCommunityLiveRefresh("artists", refresh);
    });

    expect(mocks.channel).toBe("community:artists");

    mocks.callbacks?.onReceive({ event: "refresh" });

    expect(refresh).toHaveBeenCalledTimes(1);

    mocks.callbacks?.onReceive({ event: "something_else" });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the live connection comes back, but not on the first connect", () => {
    mocks.signedIn = true;
    const refresh = vi.fn();
    renderHook(() => {
      useCommunityLiveRefresh("events", refresh);
    });

    mocks.callbacks?.onConnect();

    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    mocks.callbacks?.onConnect();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("stops listening and disconnects on unmount", () => {
    mocks.signedIn = true;
    const refresh = vi.fn();
    const { unmount } = renderHook(() => {
      useCommunityLiveRefresh("visits", refresh);
    });

    unmount();
    vi.advanceTimersByTime(60_000);
    becomeVisible();

    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("always calls the newest refresh function", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ fn }) => {
        useCommunityLiveRefresh("listings", fn);
      },
      { initialProps: { fn: first } },
    );

    rerender({ fn: second });
    vi.advanceTimersByTime(60_000);
    becomeVisible();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
