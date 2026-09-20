import { List as ImmutableList, Map as ImmutableMap } from "immutable";

import { refreshTimeline } from "./timelines";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  importFetchedStatuses: vi.fn((statuses: unknown) => ({ type: "IMPORT", statuses })),
}));

vi.mock("flavours/glitch/api", () => ({
  default: () => ({ get: mocks.get }),
  getLinks: () => ({ refs: [] }),
}));

vi.mock("flavours/glitch/initial_state", () => ({ usePendingItems: false }));
vi.mock("flavours/glitch/utils/filters", () => ({ toServerSideType: (t: string) => t }));
vi.mock("./importer", () => ({
  importFetchedStatus: vi.fn(),
  importFetchedStatuses: mocks.importFetchedStatuses,
}));
vi.mock("./markers", () => ({ submitMarkers: vi.fn() }));

type Action = { type: string; payload?: { statusId: string } } | ((...args: never[]) => unknown);

function setup(items: (string | null)[], pending: string[] = [], isLoading = false) {
  const state = ImmutableMap({
    timelines: ImmutableMap({
      community: ImmutableMap({
        isLoading,
        items: ImmutableList(items),
        pendingItems: ImmutableList(pending),
      }),
    }),
    statuses: ImmutableMap(),
  });
  const getState = () => state;
  const actions: Action[] = [];
  const dispatch = (action: Action): unknown => {
    actions.push(action);
    return typeof action === "function"
      ? (action as (d: typeof dispatch, g: typeof getState) => unknown)(dispatch, getState)
      : action;
  };
  const loadNewer = vi.fn(() => ({ type: "LOAD_NEWER" }));
  const run = () =>
    (
      refreshTimeline(
        "community",
        "/api/v1/timelines/public",
        { local: true },
        loadNewer,
      ) as unknown as (d: typeof dispatch, g: typeof getState) => Promise<void>
    )(dispatch, getState);
  const deleted = () =>
    actions
      .filter(
        (a): a is { type: string; payload: { statusId: string } } =>
          typeof a !== "function" && a.type === "timelines/delete",
      )
      .map((a) => a.payload.statusId);

  return { run, deleted, loadNewer, actions };
}

const statusesWithIds = (ids: string[]) => ids.map((id) => ({ id }));

describe("refreshTimeline", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.importFetchedStatuses.mockClear();
  });

  it("removes a held status the server no longer returns (deleted by its author)", async () => {
    const { run, deleted, loadNewer } = setup(["105", "104", "103"]);
    mocks.get.mockResolvedValue({ data: statusesWithIds(["105", "103"]) });

    await run();

    expect(deleted()).toEqual(["104"]);
    expect(loadNewer).not.toHaveBeenCalled();
  });

  it("asks for the newest 20 statuses of this feed", async () => {
    const { run } = setup(["105"]);
    mocks.get.mockResolvedValue({ data: statusesWithIds(["105"]) });

    await run();

    expect(mocks.get).toHaveBeenCalledWith("/api/v1/timelines/public", {
      params: { local: true, limit: 20 },
    });
  });

  it("does not treat a status newer than the whole page as deleted (it may have just streamed in)", async () => {
    const { run, deleted } = setup(["107", "105", "104"]);
    mocks.get.mockResolvedValue({ data: statusesWithIds(["105", "104"]) });

    await run();

    expect(deleted()).toEqual([]);
  });

  it("with a full page, leaves statuses older than the page alone", async () => {
    const page = Array.from({ length: 20 }, (_, i) => String(1000 - i));
    const { run, deleted } = setup([...page, "500", "499"]);
    mocks.get.mockResolvedValue({ data: statusesWithIds(page) });

    await run();

    expect(deleted()).toEqual([]);
  });

  it("with a full page, removes a deleted status inside the page's range", async () => {
    const held = Array.from({ length: 20 }, (_, i) => String(1000 - i));
    // The server drops 990 and, still returning a full page, reaches one older post.
    const page = [...held.filter((id) => id !== "990"), "980"];
    const { run, deleted } = setup([...held, "500"]);
    mocks.get.mockResolvedValue({ data: statusesWithIds(page) });

    await run();

    expect(deleted()).toEqual(["990"]);
  });

  it("with a short page (the whole feed), removes every held status that is gone", async () => {
    const { run, deleted } = setup(["105", "103", "101"]);
    mocks.get.mockResolvedValue({ data: statusesWithIds(["105"]) });

    await run();

    expect(deleted()).toEqual(["103", "101"]);
  });

  it("also cleans statuses waiting behind the 'new posts' pill, and ignores gap markers", async () => {
    const { run, deleted } = setup(["104", null, "103"], ["106"]);
    mocks.get.mockResolvedValue({ data: statusesWithIds(["105", "104", "103"]) });

    await run();

    expect(deleted()).toEqual([]);
  });

  it("loads newer statuses when the server has posts the timeline lacks", async () => {
    const { run, loadNewer } = setup(["104", "103"]);
    mocks.get.mockResolvedValue({ data: statusesWithIds(["106", "104", "103"]) });

    await run();

    expect(loadNewer).toHaveBeenCalledTimes(1);
  });

  it("refreshes edited statuses in place by importing the fetched page", async () => {
    const { run } = setup(["104"]);
    const page = statusesWithIds(["104"]);
    mocks.get.mockResolvedValue({ data: page });

    await run();

    expect(mocks.importFetchedStatuses).toHaveBeenCalledWith(page);
  });

  it("keeps everything when the request fails", async () => {
    const { run, deleted, loadNewer } = setup(["105", "104"]);
    mocks.get.mockRejectedValue(new Error("offline"));

    await run();

    expect(deleted()).toEqual([]);
    expect(loadNewer).not.toHaveBeenCalled();
  });

  it("keeps everything when the server says the feed is still being built (206)", async () => {
    const { run, deleted, loadNewer } = setup(["105", "104", "103"]);
    mocks.get.mockResolvedValue({ status: 206, data: statusesWithIds(["105"]) });

    await run();

    expect(deleted()).toEqual([]);
    expect(loadNewer).not.toHaveBeenCalled();
  });

  it("keeps everything when the server answers with an empty page", async () => {
    const { run, deleted } = setup(["105", "104"]);
    mocks.get.mockResolvedValue({ data: [] });

    await run();

    expect(deleted()).toEqual([]);
  });

  it("does nothing while the timeline is loading or not loaded yet", async () => {
    const loading = setup(["105"], [], true);
    await loading.run();
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
