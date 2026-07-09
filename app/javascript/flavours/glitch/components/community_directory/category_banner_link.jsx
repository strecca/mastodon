import { Link } from 'react-router-dom';

import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';

/**
 * Translatable link back to /landing (all community categories).
 * variant='cta'  → "Click here to see All Community Categories"  (entry lists / detail pages)
 * variant='back' → "← All Community Categories"                  (page-level back links)
 */
export const CategoryBannerLink = ({ variant = 'cta' }) => {
  const sc = useSiteContent();

  const label = variant === 'back'
    ? sc('nav_all_categories', '← All Community Categories')
    : sc('nav_see_all_categories', 'Click here to see All Community Categories');

  return (
    <Link to='/landing' className='community-category-banner'>
      {label}
    </Link>
  );
};
