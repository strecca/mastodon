import { fromJS } from "immutable";

import { normalizeStatus } from "@/mastodon/actions/importer/normalizer";
import type { ApiRelationshipJSON } from "@/mastodon/api_types/relationships";
import type { ApiStatusJSON } from "@/mastodon/api_types/statuses";
import type { CustomEmojiData, UnicodeEmojiData } from "@/mastodon/features/emoji/types";
import { createAccountFromServerJSON } from "@/mastodon/models/account";
import type { AnnualReport } from "@/mastodon/models/annual_report";
import type { Status } from "@/mastodon/models/status";
import type { ApiAccountJSON } from "mastodon/api_types/accounts";

type FactoryOptions<T> = {
  id?: string;
} & Partial<T>;

type FactoryFunction<T> = (options?: FactoryOptions<T>) => T;

export const accountFactory: FactoryFunction<ApiAccountJSON> = ({ id, ...data } = {}) => ({
  id: id ?? "1",
  acct: "testuser",
  avatar: "/avatars/original/missing.png",
  avatar_static: "/avatars/original/missing.png",
  avatar_description: "",
  username: "testuser",
  display_name: "Test User",
  bot: false,
  created_at: "2023-01-01T00:00:00.000Z",
  discoverable: true,
  emojis: [],
  feature_approval: {
    automatic: [],
    manual: [],
    current_user: "missing",
  },
  fields: [],
  followers_count: 0,
  following_count: 0,
  group: false,
  header: "/header.png",
  header_static: "/header_static.png",
  header_description: "",
  indexable: true,
  last_status_at: "2023-01-01",
  locked: false,
  show_featured: true,
  show_media: true,
  show_media_replies: true,
  mute_expires_at: null,
  note: "This is a test user account.",
  statuses_count: 0,
  suspended: false,
  url: "/@testuser",
  uri: "/users/testuser",
  noindex: false,
  roles: [],
  hide_collections: false,
  ...data,
});

export const accountFactoryState = (options: FactoryOptions<ApiAccountJSON> = {}) =>
  createAccountFromServerJSON(accountFactory(options));

export const statusFactory: FactoryFunction<ApiStatusJSON> = ({ id, ...data } = {}) => ({
  id: id ?? "1",
  created_at: "2023-01-01T00:00:00.000Z",
  sensitive: false,
  visibility: "public",
  language: "en",
  uri: "https://example.com/status/1",
  url: "https://example.com/status/1",
  replies_count: 0,
  reblogs_count: 0,
  quotes_count: 0,
  favorites_count: 0,
  account: accountFactory(),
  media_attachments: [],
  mentions: [],
  tags: [],
  emojis: [],
  contentHtml: data.text ?? "<p>This is a test status.</p>",
  ...data,
});

// Builds a status the way the app's reducers store it: the API-shaped JSON goes
// through the real importer normalizer (which adds contentHtml, spoilerHtml,
// search_index, hidden, ...) and is then converted to Immutable structures.
// Components read those derived fields, so a hand-rolled Map is always missing
// something.
export const statusFactoryState = (options: FactoryOptions<ApiStatusJSON> = {}) => {
  const status = statusFactory(options);

  const normalized = normalizeStatus(
    {
      ...status,
      content: status.content ?? (status as { contentHtml?: string }).contentHtml,
      spoiler_text: status.spoiler_text ?? "",
      // Sent by the server; the status importer and components read it.
      tagged_collections: [],
    },
    null,
    {},
  ) as Record<string, unknown>;

  return fromJS(normalized) as unknown as Status;
};

export const relationshipsFactory: FactoryFunction<ApiRelationshipJSON> = ({
  id,
  ...data
} = {}) => ({
  id: id ?? "1",
  following: false,
  followed_by: false,
  blocking: false,
  blocked_by: false,
  languages: null,
  muting: false,
  muting_notifications: false,
  muting_expires_at: null,
  note: "",
  requested_by: false,
  requested: false,
  domain_blocking: false,
  endorsed: false,
  notifying: false,
  showing_reblogs: true,
  ...data,
});

export function unicodeEmojiFactory(data: Partial<UnicodeEmojiData> = {}): UnicodeEmojiData {
  return {
    emoticons: undefined,
    hexcode: "test",
    label: "Test",
    unicode: "🧪",
    shortcodes: ["test_emoji"],
    tokens: ["test", "emoji"],
    group: 1,
    order: 1,
    ...data,
  };
}

export function customEmojiFactory(data: Partial<CustomEmojiData> = {}): CustomEmojiData {
  return {
    shortcode: "custom",
    static_url: "/custom-emoji/logo.svg",
    url: "/custom-emoji/logo.svg",
    visible_in_picker: true,
    tokens: ["custom"],
    ...data,
  };
}

interface AnnualReportState {
  state: "available";
  report: AnnualReport;
}

interface AnnualReportFactoryOptions {
  account_id?: string;
  status_id?: string;
  archetype?: AnnualReport["data"]["archetype"];
  year?: number;
  top_hashtag?: AnnualReport["data"]["top_hashtags"][0];
  without_posts?: boolean;
}

export function annualReportFactory({
  account_id = "1",
  status_id = "1",
  archetype = "lurker",
  year,
  top_hashtag,
  without_posts = false,
}: AnnualReportFactoryOptions = {}): AnnualReportState {
  return {
    state: "available",
    report: {
      schema_version: 2,
      share_url: "#",
      account_id,
      year: year ?? 2025,
      data: {
        archetype,
        time_series: [
          {
            month: 1,
            statuses: 0,
            followers: 0,
            following: 0,
          },
          {
            month: 2,
            statuses: 0,
            followers: 0,
            following: 0,
          },
          {
            month: 3,
            statuses: 0,
            followers: 0,
            following: 0,
          },
          {
            month: 4,
            statuses: 0,
            followers: 0,
            following: 0,
          },
          {
            month: 5,
            statuses: without_posts ? 0 : 1,
            followers: 1,
            following: 3,
          },
          {
            month: 6,
            statuses: without_posts ? 0 : 7,
            followers: 1,
            following: 0,
          },
          {
            month: 7,
            statuses: without_posts ? 0 : 2,
            followers: 0,
            following: 0,
          },
          {
            month: 8,
            statuses: without_posts ? 0 : 2,
            followers: 0,
            following: 0,
          },
          {
            month: 9,
            statuses: without_posts ? 0 : 11,
            followers: 0,
            following: 1,
          },
          {
            month: 10,
            statuses: without_posts ? 0 : 12,
            followers: 0,
            following: 1,
          },
          {
            month: 11,
            statuses: without_posts ? 0 : 6,
            followers: 0,
            following: 1,
          },
          {
            month: 12,
            statuses: without_posts ? 0 : 4,
            followers: 0,
            following: 0,
          },
        ],
        top_hashtags: top_hashtag ? [top_hashtag] : [],
        top_statuses: {
          by_reblogs: status_id,
          by_replies: status_id,
          by_favourites: status_id,
        },
      },
    },
  };
}
