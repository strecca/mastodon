import { useCallback, useEffect, useState } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import CelebrationIcon from '@/material-icons/400-24px/celebration.svg?react';
import GroupsIcon from '@/material-icons/400-24px/group.svg?react';
import TagIcon from '@/material-icons/400-24px/tag.svg?react';
import TripIcon from '@/material-icons/400-24px/trip.svg?react';
import api from 'flavours/glitch/api';
import { withIdentity } from 'flavours/glitch/identity_context';

const DEFAULTS = {
  site_name:    'Centro Comunitario',
  site_subtitle: 'Mia Civezza al Mare',
  tagline:      'La nostra comunità online — eventi, scambi, artisti e molto altro.',
  join_heading: 'Join the community',
  join_body:    'Mastodon is an open, decentralised social network. Your posts belong to you, not an algorithm. Sign up to post, interact and connect with your neighbours.',
};

const NAV_TILES = [
  {
    to:    '/community_visits',
    Icon:  TripIcon,
    label: "When I'm In Town",
    desc:  'See who\'s visiting · Share your dates',
    color: '#c62828',
    bg:    '#ffebee',
  },
  {
    to:    '/community_events',
    Icon:  CelebrationIcon,
    label: 'Community Events',
    desc:  "What's happening nearby",
    color: '#1565c0',
    bg:    '#e3f2fd',
  },
  {
    to:    '/community_listings',
    Icon:  TagIcon,
    label: 'Listings',
    desc:  'Giveaway · Trade · Sell · ISO',
    color: '#2e7d32',
    bg:    '#e8f5e9',
  },
  {
    to:    '/community',
    Icon:  GroupsIcon,
    label: 'Community Directory',
    desc:  'Artists, businesses & more',
    color: '#6a1b9a',
    bg:    '#f3e5f5',
  },
];

const SIDEBAR_HINTS = [
  { icon: '🔍', text: 'Search posts, people & tags' },
  { icon: '📣', text: 'Local & federated timelines' },
  { icon: '🔔', text: 'Notifications & mentions' },
  { icon: '💬', text: 'Private messages' },
  { icon: '📌', text: 'Trending topics & news' },
  { icon: '🌍', text: 'Connect across the Fediverse' },
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
          <span className='cl-landing__logo-main'>{settings.site_name}</span>
          <span className='cl-landing__logo-sub'>{settings.site_subtitle}</span>
        </div>
        <p className='cl-landing__tagline'>{settings.tagline}</p>

        <div className='cl-landing__hero-actions'>
          <button className='cl-landing__see-posts-btn' onClick={handleSeePosts}>
            See Posts ↓
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
        <h2 className='cl-landing__section-title'>Explore Our Community</h2>
        <div className='cl-landing__tiles'>
          {NAV_TILES.map(({ to, Icon, label, desc, color, bg }) => (
            <Link
              key={to}
              to={to}
              className='cl-landing__tile'
              style={{ '--tile-color': color, '--tile-bg': bg }}
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

      {/* ── What's inside (sidebar preview) ── */}
      <section className='cl-landing__section cl-landing__section--hints'>
        <h2 className='cl-landing__section-title'>What's inside the app</h2>
        <div className='cl-landing__hint-grid'>
          {SIDEBAR_HINTS.map(({ icon, text }) => (
            <div key={text} className='cl-landing__hint-item'>
              <span className='cl-landing__hint-icon'>{icon}</span>
              <span className='cl-landing__hint-text'>{text}</span>
            </div>
          ))}
        </div>
        <button className='cl-landing__see-posts-btn cl-landing__see-posts-btn--secondary' onClick={handleSeePosts}>
          Browse public posts →
        </button>
      </section>

      {/* ── Sign-up CTA ── */}
      {!signedIn && (
        <section className='cl-landing__cta'>
          <h2 className='cl-landing__cta-title'>{settings.join_heading}</h2>
          <p className='cl-landing__cta-body'>{settings.join_body}</p>
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
