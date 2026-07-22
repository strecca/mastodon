import { Link } from 'react-router-dom';

import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';

/**
 * Translatable link pair shown on every category list/detail page: back to
 * /landing (all community categories) alongside a companion link to the
 * live Mastodon feed (/public/local) — the live feed's own Firehose column
 * (features/firehose/index.jsx) already links back to /community, but
 * nothing linked the other direction, making the live feed effectively
 * undiscoverable from anywhere in the Community section.
 *
 * variant='cta'  → "Click here to see All Community Categories"  (entry lists / detail pages)
 * variant='back' → "← All Community Categories"                  (page-level back links)
 */
export const CategoryBannerLink = ({ variant = 'cta' }) => {
  const sc = useSiteContent();

  const label = variant === 'back'
    ? sc('nav_all_categories', '← All Community Categories')
    : sc('nav_see_all_categories', 'Click here to see All Community Categories');

  return (
    <div className='community-category-banner-row'>
      <Link to='/landing' className='community-category-banner'>
        {label}
      </Link>
      <Link to='/public/local' className='community-category-banner community-category-banner--posts'>
        {sc('nav_see_live_posts', 'See Live Posts')}
      </Link>
    </div>
  );
};
