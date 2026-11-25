import api from "flavours/glitch/api";

export interface NotificationCategory {
  name: string;
  display_name: string;
}

export interface NotificationSettingsData {
  categories: NotificationCategory[];
  subscriptions: unknown[];
  targets: unknown[];
  preferences: unknown;
}

// Everything the Notification Settings page needs, loaded independently: one
// failing request leaves only its own section empty instead of the whole page.
//
// Categories come from the PUBLIC category list. Until 2026-11-25 the page used
// the admin-only /api/v1/community_directory/categories, which refuses (403)
// every member who isn't an admin, and because the four requests were loaded
// all-or-nothing, the page was blank for all ordinary members. The public list
// is also the right set: exactly the categories that send notifications.
export async function loadNotificationSettings(): Promise<NotificationSettingsData> {
  const [categories, subscriptions, targets, preferences] = await Promise.allSettled([
    api().get<NotificationCategory[]>("/api/v1/community_directory_public"),
    api().get<unknown[]>("/api/v1/member_notification_category_subscriptions"),
    api().get<unknown[]>("/api/v1/member_notification_targets"),
    api().get<unknown>("/api/v1/member_notification_preferences"),
  ]);

  return {
    categories:
      categories.status === "fulfilled"
        ? categories.value.data.map(({ name, display_name }) => ({ name, display_name }))
        : [],
    subscriptions: subscriptions.status === "fulfilled" ? subscriptions.value.data : [],
    targets: targets.status === "fulfilled" ? targets.value.data : [],
    preferences: preferences.status === "fulfilled" ? preferences.value.data : null,
  };
}
