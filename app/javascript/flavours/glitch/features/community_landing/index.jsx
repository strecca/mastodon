import { useCallback, useEffect, useState } from 'react';

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
import api from 'flavours/glitch/api';
import { withIdentity } from 'flavours/glitch/identity_context';

const DEFAULTS = {
  site_name:    'Centro Comunitario',
  site_subtitle: 'Mia Civezza al Mare',
  tagline:      'La nostra comunità online — eventi, scambi, artisti e molto altro.',
  join_heading: 'Join the MiaCivezza.com Community',
  join_body:    'You will be able to make your own posts to all of us as well as add your own Civezza Community Events, Favorite Restaurants, and List Items for Sale, Giveaway, Trade or Searching For & Properties for Sale, Rent or for short-term Vacation stays. Also in the Community Services section let us know your skills or pass along the names and contacts for Builders, Architects, Craftspeople, Cooks, Cleaning, Property Management, or where to go and who to see for various permits, regulations, etc. Additionally you can post for Members to see privately the dates when you will be returning to Civezza or the Imperia area and the details to alert us to know you\'re hoping to see other Members while you are back in Italy. Registration is Free. No Credit Card required. Come Join us!',
};

// Backgrounds darkened from the Cinque Terre (Manarola) palette for WCAG AA white-text contrast
const NAV_TILES = [
  {
    to:    '/community_listings',
    Icon:  TagIcon,
    label: 'Community Listings',
    desc:  'Giveaway · Trade · Sell · ISO',
    bg:    '#5A7A1A',  // darkened olive  (#7A9A2B)
  },
  {
    to:    '/community_events',
    Icon:  CelebrationIcon,
    label: 'Community Events',
    desc:  "What's happening nearby",
    bg:    '#007A80',  // darkened turquoise  (#00C0C0)
  },
  {
    to:    '/community_properties',
    Icon:  HomeIcon,
    label: 'Community Properties',
    desc:  'Houses · Apartments · Rentals',
    bg:    '#8B2240',  // darkened deep rose  (#C23B5A)
  },
  {
    to:    '/community_services',
    Icon:  ManufacturingIcon,
    label: 'Community Services',
    desc:  'Local businesses & services',
    bg:    '#8B3E24',  // darkened terracotta  (#E87050)
  },
  {
    to:    '/community_restaurants',
    Icon:  StarIcon,
    label: 'Community Restaurants',
    desc:  'Dining · Cafés · Trattorias',
    bg:    '#A8302A',  // darkened tomato red  (#E8453C)
  },
  {
    to:    '/community_artists',
    Icon:  BrushIcon,
    label: 'Community Artists',
    desc:  'Local talent & creatives',
    bg:    '#7A5410',  // darkened warm sand/gold  (#F0C472)
  },
  {
    to:    '/community_visits',
    Icon:  TripIcon,
    label: "Community When I'm In Town",
    desc:  "See who's visiting · Share your dates",
    bg:    '#6B1A30',  // deep crimson (second Cinque Terre rose, shifted darker)
  },
  {
    to:    '/member_stories',
    Icon:  GroupsIcon,
    label: 'Member Stories',
    desc:  'Personal histories · Civezza connections',
    bg:    '#2C3E7A',  // deep Mediterranean navy
  },
];


const CommunityLanding = ({ identity }) => {
  const history  = useHistory();
  const signedIn = identity?.signedIn;
  const isAdmin  = identity?.permissions === 1;

  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    api().get('/api/v1/community_landing')
      .then(res => setSettings({ ...DEFAULTS, ...res.data }))
      .catch(() => {}); // fall back to defaults silently
  }, []);

  const handleSeePosts = useCallback(() => {
    history.push('/public/local');
  }, [history]);

  return (
    <div className='cl-landing scrollable'>
      <Helmet>
        <title>{settings.site_name} — {settings.site_subtitle}</title>
        <meta name='description' content={settings.tagline} />
      </Helmet>

      {/* ── Hero / Logo ── */}
      <header className='cl-landing__hero'>
        <div className='cl-landing__logo'>
          <span className='cl-landing__logo-main'>Civezza Community Directory</span>
        </div>
        <p className='cl-landing__tagline'>Explore everything our community has to offer</p>

        <div className='cl-landing__hero-actions'>
          <button className='cl-landing__see-posts-btn' onClick={handleSeePosts}>
            See Community Posts
          </button>
          {!signedIn && (
            <a href='/auth/sign_in' className='cl-landing__login-link'>Log in →</a>
          )}
        </div>

        {isAdmin && (
          <div className='cl-landing__admin-bar'>
            <Link to='/community_directory/landing-settings' className='cl-landing__admin-link'>
              ✏️ Edit landing page text
            </Link>
          </div>
        )}
      </header>

      {/* ── Community tiles ── */}
      <section className='cl-landing__section'>
        <div className='cl-landing__tiles'>
          {NAV_TILES.map(({ to, Icon, label, desc, bg }) => (
            <Link
              key={to}
              to={to}
              className='cl-landing__tile'
              style={{ '--tile-bg': bg }}
            >
              <span className='cl-landing__tile-icon-wrap'>
                <Icon />
              </span>
              <span className='cl-landing__tile-label'>{label}</span>
              <span className='cl-landing__tile-desc'>{desc}</span>
              <span className='cl-landing__tile-arrow'>→</span>
            </Link>
          ))}
        </div>
      </section>


      {/* ── Sign-up CTA ── */}
      {!signedIn && (
        <section className='cl-landing__cta'>
          <h2 className='cl-landing__cta-title'>{settings.join_heading}</h2>
          <ul className='cl-landing__cta-features'>
            <li className='cl-landing__cta-feature'>
              <span className='cl-landing__cta-feature-icon'><CelebrationIcon /></span>
              <span>Make your own posts, add Civezza Community Events, Favorite Restaurants, and list items for Sale, Giveaway, Trade or Searching For &mdash; plus Properties for Sale, Rent or short-term Vacation stays.</span>
            </li>
            <li className='cl-landing__cta-feature'>
              <span className='cl-landing__cta-feature-icon'><ManufacturingIcon /></span>
              <span>In the Community Services section, share your skills or recommend Builders, Architects, Craftspeople, Cooks, Cleaning services, Property Management, and guidance on permits, regulations, and local contacts.</span>
            </li>
            <li className='cl-landing__cta-feature'>
              <span className='cl-landing__cta-feature-icon'><TripIcon /></span>
              <span>Post <em>When I&apos;ll Be In Town</em> to privately share the dates you&apos;ll be returning to Civezza or the Imperia area &mdash; and let Members know you&apos;d love to connect while you&apos;re back in Italy.</span>
            </li>
          </ul>
          <p className='cl-landing__cta-footer'>Registration is Free. No Credit Card required. Come Join us!</p>
          <div className='cl-landing__cta-actions'>
            <a href='/auth/sign_up' className='button cl-landing__signup-btn'>Create Account</a>
            <a href='/auth/sign_in' className='button button-secondary'>Log In</a>
          </div>
        </section>
      )}
    </div>
  );
};

export default withIdentity(CommunityLanding);
