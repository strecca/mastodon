import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyUpdate, checkForUpdate } from "./app_update";

// __BUILD_ID__ is "test-build-id" under vitest (see vitest.config.mts).
const CURRENT_SW = 'const BUILD_ID="test-build-id";self.addEventListener("message",()=>{});';
const NEWER_SW = 'const BUILD_ID="a-newer-build";self.addEventListener("message",()=>{});';

function setRegistration(registration: unknown) {
  const addEventListener = vi.fn();

  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      addEventListener,
      removeEventListener: vi.fn(),
    },
  });

  return { addEventListener };
}

function fakeRegistration(overrides: Record<string, unknown> = {}) {
  return {
    update: vi.fn().mockResolvedValue(undefined),
    installing: null,
    waiting: null,
    active: {},
    ...overrides,
  };
}

function mockSwFetch(body: string, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, text: () => Promise.resolve(body) });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("checkForUpdate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("reports an update when a newer service worker is installed and waiting", async () => {
    setRegistration(fakeRegistration({ waiting: {}, active: {} }));
    mockSwFetch(CURRENT_SW);

    await expect(checkForUpdate()).resolves.toBe("available");
  });

  it("does not treat a first-ever install (no active worker yet) as an update", async () => {
    setRegistration(fakeRegistration({ waiting: {}, active: null }));
    mockSwFetch(CURRENT_SW);

    await expect(checkForUpdate()).resolves.toBe("current");
  });

  it("is current when the live sw.js carries this bundle's build id", async () => {
    setRegistration(fakeRegistration());
    const fetchMock = mockSwFetch(CURRENT_SW);

    await expect(checkForUpdate()).resolves.toBe("current");
    // Must bypass every cache, or a stale copy would hide a new deploy.
    expect(fetchMock).toHaveBeenCalledWith(
      "/sw.js",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("reports an update when the live sw.js has a different build id, even with no service worker registered", async () => {
    setRegistration(undefined);
    mockSwFetch(NEWER_SW);

    await expect(checkForUpdate()).resolves.toBe("available");
  });

  it("still works when the browser has no service worker support at all", async () => {
    mockSwFetch(NEWER_SW);

    await expect(checkForUpdate()).resolves.toBe("available");
  });

  it("reports an error, not 'up to date', when it cannot reach the server", async () => {
    setRegistration(fakeRegistration());
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(checkForUpdate()).resolves.toBe("error");
  });

  it("reports an error when the server answers with a failure status", async () => {
    setRegistration(fakeRegistration());
    mockSwFetch("", false);

    await expect(checkForUpdate()).resolves.toBe("error");
  });

  it("falls back to the direct check when the service worker update call fails", async () => {
    setRegistration(fakeRegistration({ update: vi.fn().mockRejectedValue(new Error("boom")) }));
    mockSwFetch(NEWER_SW);

    await expect(checkForUpdate()).resolves.toBe("available");
  });
});

describe("applyUpdate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("tells a waiting worker to take over, so the new worker and page arrive together", async () => {
    const postMessage = vi.fn();
    const { addEventListener } = setRegistration(fakeRegistration({ waiting: { postMessage } }));

    await applyUpdate();

    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(addEventListener).toHaveBeenCalledWith("controllerchange", expect.any(Function), {
      once: true,
    });
  });
});
