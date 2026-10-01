import { Link } from "react-router-dom";

import { useSiteContent } from "flavours/glitch/hooks/useSiteContent";
import ArrowBackIcon from "@/material-icons/400-24px/arrow_back-fill.svg?react";

/**
 * Translatable link shown on every category list/detail page, back to
 * /landing's category board -- the consolidated front door (Live Posts,
 * Daily Digest, and every category, all on one page as of the front-door
 * redesign).
 *
 * Links to /landing#fd-board, not bare /landing: the front door opens on
 * its Live Posts pane by default, so a bare /landing link meant this
 * "see all categories" link actually required a *second* click (the
 * Community tab) to reach the categories -- confirmed live 2026-09-24.
 * community_landing/index.jsx scrolls straight to the #fd-board section on
 * mount when it sees this hash, the same jump its own Community tab does.
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
 * variant='back' → arrow_back icon + "All Community Categories"  (page-level back links)
 *
 * The back variant's arrow used to be a literal "←" character baked into the
 * translatable site-content text itself. Replaced 2026-09-30 with a real
 * icon, rendered separately from the (now arrow-free) text, so it reads as
 * an actual clickable affordance rather than a text glyph -- David asked for
 * this to be more visually obvious as a "go back" action, especially on
 * mobile. The site_content default strings AND the live DB rows (all 8
 * locales) were updated together to drop the leading "← " they'd had before,
 * so this doesn't end up rendering a duplicate arrow.
 *
 * Round 2, same day: a plain 22px outline icon still read as too small/subtle
 * per David's reference image (a bold circular back-button badge -- thick
 * ring, thick rounded arrow inside, not a bare glyph). No pre-made icon like
 * that exists in this project's vendored Material Icons subset, so it is
 * built from the filled arrow_back-fill icon inside a CSS circle badge
 * (border + fixed size) rather than one custom SVG asset -- see
 * __arrow-badge in the SCSS.
 *
 * Round 3, 2026-10-01: the badge was gated behind variant === 'back' only,
 * so every category using the default 'cta' variant (the generator
 * categories: properties, services, restaurants, artists) had NO arrow at
 * all -- confirmed live by David pasting the actual rendered HTML from
 * each category. Badge now renders for both variants; only the text label
 * still differs between them.
 */
export const CategoryBannerLink = ({ variant = "cta" }) => {
  const sc = useSiteContent();

  const label =
    variant === "back"
      ? sc("nav_all_categories", "All Community Categories")
      : sc("nav_see_all_categories", "Click here to see All Community Categories");

  return (
    <div className="community-category-banner-row">
      <Link to="/landing#fd-board" className="community-category-banner">
        <span className="community-category-banner__arrow-badge">
          <ArrowBackIcon className="community-category-banner__arrow" aria-hidden="true" />
        </span>
        {label}
      </Link>
    </div>
  );
};
