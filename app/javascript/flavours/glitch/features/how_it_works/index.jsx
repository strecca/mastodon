import { Helmet } from '@unhead/react/helmet';
import { Link } from 'react-router-dom';

import ArticleIcon from '@/material-icons/400-24px/article.svg?react';
import CelebrationIcon from '@/material-icons/400-24px/celebration.svg?react';
import CollectionsIcon from '@/material-icons/400-24px/category.svg?react';
import DescriptionIcon from '@/material-icons/400-24px/description.svg?react';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import MailIcon from '@/material-icons/400-24px/mail.svg?react';
import PersonAddIcon from '@/material-icons/400-24px/person_add.svg?react';
import PublicIcon from '@/material-icons/400-24px/public.svg?react';
import TagIcon from '@/material-icons/400-24px/tag.svg?react';
import TripIcon from '@/material-icons/400-24px/trip.svg?react';
import { withIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';

// Ordered to match the golden path: join → hub → each nav item → language → help.
// Colors reuse the community_landing tile palette where a section maps to a tile,
// so the guide visually rhymes with the tiles it's explaining.
const SECTIONS = [
  { key: 'join',        Icon: PersonAddIcon,   to: null,                  bg: '#2e7d32' },
  { key: 'community',   Icon: CollectionsIcon, to: '/landing',            bg: '#3949ab' },
  { key: 'listings',    Icon: TagIcon,         to: '/community_listings', bg: '#5A7A1A' },
  { key: 'visits',      Icon: TripIcon,        to: '/community_visits',   bg: '#6B1A30' },
  { key: 'events',      Icon: CelebrationIcon, to: '/community_events',   bg: '#007A80' },
  { key: 'digest',      Icon: ArticleIcon,     to: '/daily',              bg: '#8a6d1f' },
  { key: 'newsletters', Icon: DescriptionIcon, to: '/newsletters',        bg: '#6364ff' },
  { key: 'stories',     Icon: GroupsIcon,      to: '/member_stories',     bg: '#2C3E7A' },
  { key: 'language',    Icon: PublicIcon,      to: null,                  bg: '#455A64' },
  { key: 'contact',     Icon: MailIcon,        to: '/contact',            bg: '#8B3E24' },
];

const SECTION_DEFAULTS = {
  join:        { title: 'Joining & Signing In', body: 'Registration is free — just click "Join" or "Create Account" from the home page.' },
  community:   { title: 'The Community Hub', body: 'Click "Community" in the menu to see the full directory as a grid of tiles.' },
  listings:    { title: 'Browsing Listings & Categories', body: 'Buy, sell, trade, or give away items, and browse Services, Restaurants, Properties, and Artists.' },
  visits:      { title: "When I'm In Town", body: 'Privately share your visit dates so friends can plan to meet up.' },
  events:      { title: 'Community Events', body: 'A live calendar of concerts, festivals, markets, and gatherings.' },
  digest:      { title: 'The Daily Digest', body: 'A bilingual daily newspaper of local events and community news.' },
  newsletters: { title: 'Newsletters', body: 'Longer community stories and updates, published from time to time.' },
  stories:     { title: 'Member Stories', body: 'Residents and visitors share their own connection to Civezza.' },
  language:    { title: 'Switching Languages', body: 'Tap the globe icon at the top of the menu to change viewing language.' },
  contact:     { title: 'Getting Help', body: 'Use "Contact Admin" in the menu to send a message directly to the team.' },
};

const HowItWorks = ({ identity }) => {
  const isAdmin = identity?.permissions === 1;
  const sc = useSiteContent();

  return (
    <div className='hiw-page scrollable'>
      <Helmet>
        <title>{sc('guide_page_title', 'How MiaCivezza.com Works')}</title>
        <meta name='description' content={sc('guide_page_intro', "A quick tour of everything you can do on MiaCivezza.com.")} />
      </Helmet>

      <header className='hiw-page__hero'>
        <h1 className='hiw-page__title'>{sc('guide_page_title', 'How MiaCivezza.com Works')}</h1>
        <p className='hiw-page__intro'>{sc('guide_page_intro', "MiaCivezza.com is more than a social network — it's a digital piazza for the Civezza and Imperia coast community. Here's a quick tour of everything you can do.")}</p>

        {isAdmin && (
          <div className='hiw-page__admin-bar'>
            <a href='/admin/site_settings/edit' className='hiw-page__admin-link'>
              ✏️ Edit this guide &amp; translations
            </a>
          </div>
        )}
      </header>

      <div className='hiw-page__intro-card'>
        <h2 className='hiw-page__intro-title'>{sc('guide_intro_title', 'What is MiaCivezza.com?')}</h2>
        <p className='hiw-page__intro-body'>{sc('guide_intro_body', "MiaCivezza.com is a private community bulletin board for residents, visitors, and friends of Civezza and the Imperia coast.")}</p>
      </div>

      <div className='hiw-page__sections'>
        {SECTIONS.map(({ key, Icon, to, bg }) => (
          <section key={key} className='hiw-page__section' style={{ '--section-bg': bg }}>
            <span className='hiw-page__section-icon'>
              <Icon />
            </span>
            <div className='hiw-page__section-body'>
              <h3 className='hiw-page__section-title'>{sc(`guide_${key}_title`, SECTION_DEFAULTS[key].title)}</h3>
              <p className='hiw-page__section-text'>{sc(`guide_${key}_body`, SECTION_DEFAULTS[key].body)}</p>
              {to && (
                <Link to={to} className='hiw-page__section-link'>
                  Try it →
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default withIdentity(HowItWorks);
