import { loadNotificationSettings } from "./load_settings";

const mocks = vi.hoisted(() => ({
  responses: {} as Record<string, unknown>,
  failing: new Set<string>(),
}));

vi.mock("flavours/glitch/api", () => ({
  default: () => ({
    get: (path: string) =>
      mocks.failing.has(path)
        ? Promise.reject(new Error(`403 ${path}`))
        : Promise.resolve({ data: mocks.responses[path] }),
  }),
}));

const PUBLIC = "/api/v1/community_directory_public";
const ADMIN_ONLY = "/api/v1/community_directory/categories";

describe("loadNotificationSettings", () => {
  beforeEach(() => {
    mocks.failing.clear();
    mocks.responses = {
      [PUBLIC]: [
        {
          name: "events",
          display_name: "Community Events",
          table_name: "community_events",
          entries_count: 4,
        },
        {
          name: "artists",
          display_name: "Community Artists",
          table_name: "community_artists",
          entries_count: 2,
        },
      ],
      "/api/v1/member_notification_category_subscriptions": [{ id: 1, category_key: "events" }],
      "/api/v1/member_notification_targets": [{ id: 7 }],
      "/api/v1/member_notification_preferences": { email_frequency: "digest" },
    };
  });

  it("reads categories from the public list, not the admin-only one", async () => {
    mocks.failing.add(ADMIN_ONLY);

    const data = await loadNotificationSettings();

    expect(data.categories).toEqual([
      { name: "events", display_name: "Community Events" },
      { name: "artists", display_name: "Community Artists" },
    ]);
  });

  it("still loads the other sections when one request fails", async () => {
    mocks.failing.add(PUBLIC);

    const data = await loadNotificationSettings();

    expect(data.categories).toEqual([]);
    expect(data.subscriptions).toEqual([{ id: 1, category_key: "events" }]);
    expect(data.targets).toEqual([{ id: 7 }]);
    expect(data.preferences).toEqual({ email_frequency: "digest" });
  });

  it("returns empty defaults when everything fails", async () => {
    Object.keys(mocks.responses).forEach((path) => mocks.failing.add(path));

    const data = await loadNotificationSettings();

    expect(data).toEqual({ categories: [], subscriptions: [], targets: [], preferences: null });
  });
});
