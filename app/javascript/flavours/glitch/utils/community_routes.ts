// Path prefixes that make up the Community section: the front door
// (/landing) and everything reachable from it. Used to theme the whole
// 3-column app shell (compose panel + nav panel + routed content) with the
// same warm cream palette as the front door itself (see @mixin fd-palette
// in styles/mastodon/community_directory.scss), at one single choke point
// -- features/ui/components/columns_area.tsx -- instead of opting in
// page by page, which is how /community_listings ended up looking
// inconsistent with the rest (2026-09-24).
//
// Deliberately excludes native Mastodon surfaces (Home timeline,
// Notifications, Settings) and admin/moderation screens, which keep the
// site's standard theme.
const COMMUNITY_ROUTE_PREFIXES = [
  "/landing",
  "/community_restaurants",
  "/community_artists",
  "/community_properties",
  "/community_services",
  "/community_listings",
  "/community_events",
  "/community_visits",
  "/community_notifications",
  "/member_stories",
  "/guide",
  "/shared",
  "/daily",
  "/newsletters",
  "/directory",
  "/contact",
];

export const isCommunityRoute = (pathname: string): boolean => {
  if (pathname.includes("/admin")) return false;
  if (pathname.startsWith("/community_directory")) return false;
  if (pathname.startsWith("/community_maintenance")) return false;

  return COMMUNITY_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};
