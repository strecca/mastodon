import { apiGetFeaturedTags } from "flavours/glitch/api/accounts";
import { createDataLoadingThunk } from "flavours/glitch/store/typed_functions";

export const fetchFeaturedTags = createDataLoadingThunk(
  "accounts/featured_tags",
  ({ accountId }: { accountId: string }) => apiGetFeaturedTags(accountId),
  // A signed-out visitor opening any public profile 401s here (confirmed
  // live 2026-09-24), even though the profile itself loads fine
  // anonymously -- don't show the generic "Members Only" alert over what's
  // otherwise a normal, successful page view. Same reasoning as
  // fetchContext in actions/statuses_typed.ts.
  { skipAlert: true },
);
