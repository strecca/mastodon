import { Link } from "react-router-dom";

import { useSiteContent } from "flavours/glitch/hooks/useSiteContent";

/**
 * Translatable link shown on every category list/detail page, back to
 * /landing -- the consolidated front door (Live Posts, Daily Digest, and
 * every category, all on one page as of the front-door redesign).
 *
 * Used to be a link pair: this one plus a separate "See Live Posts" link to
 * /public/local, the old standalone (differently styled) live feed page.
 * Dropped 2026-09-23: since /landing now has Live Posts on it too, a second
 * link to a *different* page showing the *same* thing was no longer a real
 * alternative destination, just a second, inconsistent-looking path to
 * content already one click away -- confirmed live: someone using the "See
 * Live Posts" link visibly dropped out of the new page's styling into the
 * old one.
 *
 * variant='cta'  → "Click here to see All Community Categories"  (entry lists / detail pages)
 * variant='back' → "← All Community Categories"                  (page-level back links)
 */
export const CategoryBannerLink = ({ variant = "cta" }) => {
  const sc = useSiteContent();

  const label =
    variant === "back"
      ? sc("nav_all_categories", "← All Community Categories")
      : sc("nav_see_all_categories", "Click here to see All Community Categories");

  return (
    <div className="community-category-banner-row">
      <Link to="/landing" className="community-category-banner">
        {label}
      </Link>
    </div>
  );
};
