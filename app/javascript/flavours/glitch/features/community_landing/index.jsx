import { useCallback } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import BrushIcon from '@/material-icons/400-24px/brush.svg?react';
import CelebrationIcon from '@/material-icons/400-24px/celebration.svg?react';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import HomeIcon from '@/material-icons/400-24px/home.svg?react';
import ManufacturingIcon from '@/material-icons/400-24px/manufacturing.svg?react';
import StarIcon from '@/material-icons/400-24px/star.svg?react';
import TagIcon from '@/material-icons/400-24px/tag.svg?react';
import TripIcon from '@/material-icons/400-24px/trip.svg?react';
import { withIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';

// Backgrounds darkened from the Cinque Terre (Manarola) palette for WCAG AA white-text contrast
const TILE_DEFS = [
  { to: '/community_listings',   Icon: TagIcon,          key: 'listings',     bg: '#5A7A1A' },
  { to: '/community_events',     Icon: CelebrationIcon,  key: 'events',       bg: '#007A80' },
  { to: '/community_properties', Icon: HomeIcon,         key: 'properties',   bg: '#8B2240' },
  { to: '/community_services',   Icon: ManufacturingIcon, key: 'services',    bg: '#8B3E24' },
  { to: '/community_restaurants', Icon: StarIcon,        key: 'restaurants',  bg: '#A8302A' },
  { to: '/community_artists',    Icon: BrushIcon,        key: 'artists',      bg: '#7A5410' },
  { to: '/community_visits',     Icon: TripIcon,         key: 'visits',       bg: '#6B1A30' },
  { to: '/member_stories',       Icon: GroupsIcon,       key: 'stories',      bg: '#2C3E7A' },
];

// Default labels/descs used until the API responds (avoids empty tiles on first paint)
const TILE_DEFAULTS = {
  listings:    { label: 'Community Listings',          desc: 'Giveaway · Trade · Sell · ISO' },
  events:      { label: 'Community Events',            desc: "What's happening nearby" },
  properties:  { label: 'Community Properties',        desc: 'Houses · Apartments · Rentals' },
  services:    { label: 'Community Services',          desc: 'Local businesses & services' },
  restaurants: { label: 'Community Restaurants',       desc: 'Dining · Cafés · Trattorias' },
  artists:     { label: 'Community Artists',           desc: 'Local talent & creatives' },
  visits:      { label: "Community When I'm In Town",  desc: "See who's visiting · Share your dates" },
  stories:     { label: 'Member Stories',              desc: 'Personal histories · Civezza connections' },
};

const CommunityLanding = ({ identity }) => {
  const history  = useHistory();
  const signedIn = identity?.signedIn;
  const isAdmin  = identity?.permissions === 1;
  const sc       = useSiteContent();

  const handleSeePosts = useCallback(() => {
    history.push('/public/local');
  }, [history]);

  return (
    <div className='cl-landing scrollable'>
      <Helmet>
        <title>{sc('landing_logo_text', 'Civezza Community Directory')}</title>
        <meta name='description' content={sc('landing_hero_tagline', 'Explore everything our community has to offer')} />
      </Helmet>

      {/* ── Hero / Logo ── */}
      <header className='cl-landing__hero'>
        <div className='cl-landing__logo'>
          <span className='cl-landing__logo-main'>{sc('landing_logo_text', 'Civezza Community Directory')}</span>
        </div>
        <p className='cl-landing__tagline'>{sc('landing_hero_tagline', 'Explore everything our community has to offer')}</p>

        <div className='cl-landing__hero-actions'>
          <button className='cl-landing__see-posts-btn' onClick={handleSeePosts}>
            {sc('landing_see_posts_btn', 'See Community Posts')}
          </button>
          <Link to='/directory' className='cl-landing__see-posts-btn cl-landing__see-posts-btn--secondary'>
            {sc('landing_browse_profiles_btn', 'Browse Profiles')}
          </Link>
          {!signedIn && (
            <a href='/auth/sign_in' className='cl-landing__login-link'>{sc('landing_login_link', 'Log in →')}</a>
          )}
        </div>

        {isAdmin && (
          <div className='cl-landing__admin-bar'>
            <a href='/admin/site_settings/edit' className='cl-landing__admin-link'>
              ✏️ Edit page text &amp; translations
            </a>
          </div>
        )}
      </header>

      {/* ── Community tiles ── */}
      <section className='cl-landing__section'>
        <div className='cl-landing__tiles'>
          {TILE_DEFS.map(({ to, Icon, key, bg }) => (
            <Link
              key={to}
              to={to}
              className='cl-landing__tile'
              style={{ '--tile-bg': bg }}
            >
              <span className='cl-landing__tile-icon-wrap'>
                <Icon />
              </span>
              <span className='cl-landing__tile-label'>
                {sc(`tile_${key}_label`, TILE_DEFAULTS[key].label)}
              </span>
              <span className='cl-landing__tile-desc'>
                {sc(`tile_${key}_desc`, TILE_DEFAULTS[key].desc)}
              </span>
              <span className='cl-landing__tile-arrow'>→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Sign-up CTA ── */}
      {!signedIn && (
        <section className='cl-landing__cta'>
          <h2 className='cl-landing__cta-title'>{sc('landing_join_heading', 'Join the MiaCivezza.com Community')}</h2>
          <ul className='cl-landing__cta-features'>
            <li className='cl-landing__cta-feature'>
              <span className='cl-landing__cta-feature-icon'><CelebrationIcon /></span>
              <span>{sc('landing_join_feature_1', 'Make your own posts, add Civezza Community Events, Favorite Restaurants, and list items for Sale, Giveaway, Trade or Searching For — plus Properties for Sale, Rent or short-term Vacation stays.')}</span>
            </li>
            <li className='cl-landing__cta-feature'>
              <span className='cl-landing__cta-feature-icon'><ManufacturingIcon /></span>
              <span>{sc('landing_join_feature_2', 'In the Community Services section, share your skills or recommend Builders, Architects, Craftspeople, Cooks, Cleaning services, Property Management, and guidance on permits, regulations, and local contacts.')}</span>
            </li>
            <li className='cl-landing__cta-feature'>
              <span className='cl-landing__cta-feature-icon'><TripIcon /></span>
              <span>{sc('landing_join_feature_3', "Post When I'll Be In Town to privately share the dates you'll be returning to Civezza or the Imperia area — and let Members know you'd love to connect while you're back in Italy.")}</span>
            </li>
          </ul>
          <p className='cl-landing__cta-footer'>{sc('landing_join_footer', 'Registration is Free. No Credit Card required. Come Join us!')}</p>
          <div className='cl-landing__cta-actions'>
            <a href='/auth/sign_up' className='button cl-landing__signup-btn'>{sc('landing_create_account', 'Create Account')}</a>
            <a href='/auth/sign_in' className='button button-secondary'>{sc('landing_login_link', 'Log In')}</a>
          </div>
        </section>
      )}
    </div>
  );
};

export default withIdentity(CommunityLanding);
