import { useEffect } from 'react';

import { Helmet } from '@unhead/react/helmet';
import { Link } from 'react-router-dom';

import ArticleIcon from '@/material-icons/400-24px/article.svg?react';
import CelebrationIcon from '@/material-icons/400-24px/celebration.svg?react';
import CollectionsIcon from '@/material-icons/400-24px/category.svg?react';
import DescriptionIcon from '@/material-icons/400-24px/description.svg?react';
import DownloadIcon from '@/material-icons/400-24px/download.svg?react';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import MailIcon from '@/material-icons/400-24px/mail.svg?react';
import PersonAddIcon from '@/material-icons/400-24px/person_add.svg?react';
import PublicIcon from '@/material-icons/400-24px/public.svg?react';
import TagIcon from '@/material-icons/400-24px/tag.svg?react';
import TripIcon from '@/material-icons/400-24px/trip.svg?react';
import { fetchServer } from 'flavours/glitch/actions/server';
import { ServerHeroImage } from 'flavours/glitch/components/server_hero_image';
import { withIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';
import { useAppSelector, useAppDispatch } from 'flavours/glitch/store';

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

// guide_intro_body / guide_tip_body are stored as newline-separated bullet
// lines in a single site_content textarea (keeps the admin editor simple —
// one field per section, no new content-model changes needed).
const toBullets = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean);

const INTRO_BODY_FALLBACK = [
  "MiaCivezza.com is a private community bulletin board for residents, visitors, and friends of Civezza and the Imperia coast. It's built on the same technology as social networks like X or Whatsapp, but closed, exclusive to our community — you won't find strangers from around the world here, just neighbours and friends.",
  'Use it to find local services, discover events, coordinate visits, read community news, and stay connected between trips.',
  'We are building this website by inviting YOU to start filling it up with your own content. As more people join and begin to post in our different categories you will see MiaCivezza.com become more beautiful, useful and we hope indispensable to your daily Civezza centered experiences!',
].join('\n');

const TIP_BODY_FALLBACK = [
  'The richest way to get familiar with MiaCivezza.com — browsing every category, writing your first posts, and uploading photos — is easiest on a desktop computer or laptop.',
  'You will see all three columns of miacivezza.com at once and can easily get acquainted with all its features.',
  "Once you've added your entries and found your way around, your phone's browser is perfect for everyday use: checking events, browsing listings, and staying in touch while you're out and about.",
].join('\n');

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
  const dispatch = useAppDispatch();
  const server = useAppSelector((state) => state.server.server);

  useEffect(() => {
    dispatch(fetchServer());
  }, [dispatch]);

  return (
    <div className='hiw-page scrollable'>
      <Helmet>
        <title>{sc('guide_page_title', 'How MiaCivezza.com Works')}</title>
        <meta name='description' content={sc('guide_page_intro', "A quick tour of everything you can do on MiaCivezza.com.")} />
      </Helmet>

      <header className='hiw-page__hero'>
        {server?.item?.thumbnail?.url && (
          <ServerHeroImage
            blurhash={server.item.thumbnail.blurhash}
            src={server.item.thumbnail.url}
            alt=''
            className='hiw-page__logo-image'
          />
        )}
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

      <div className='hiw-page__bio'>
        {sc('about_photo_url', '') && (
          <img src={sc('about_photo_url', '')} alt='' className='hiw-page__bio-photo' />
        )}
        <div className='hiw-page__bio-text'>
          <h2 className='hiw-page__bio-title'>{sc('guide_bio_title', 'Why I Built This')}</h2>
          <p className='hiw-page__bio-body'>{sc('about_bio_p1', "MiaCivezza.com is my attempt to provide an online Community Bulletin Board and Piazzetta meeting plaza. My Wife & I would meet people at dinner or aperitivo time or at artistic or musical events, make friends and then say Goodbye and want to stay in contact with them. We'd try to exchange contact information as the last process of saying \"We hope to see you again\".")}</p>
          <p className='hiw-page__bio-body'>{sc('about_bio_p2', 'Now Visitors and Residents have immediate access to contact each other to renew friendships and to reunite.')}</p>
        </div>
      </div>

      <div className='hiw-page__intro-card'>
        <h2 className='hiw-page__intro-title'>{sc('guide_intro_title', 'What is MiaCivezza.com?')}</h2>
        <ul className='hiw-page__intro-body'>
          {toBullets(sc('guide_intro_body', INTRO_BODY_FALLBACK)).map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>

      <div className='hiw-page__tip'>
        <h2 className='hiw-page__tip-title'>{sc('guide_tip_title', '💡 Tip: Start on a computer, if you can')}</h2>
        <ul className='hiw-page__tip-body'>
          {toBullets(sc('guide_tip_body', TIP_BODY_FALLBACK)).map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>

      <div className='hiw-page__install'>
        <div className='hiw-page__install-text'>
          <span className='hiw-page__install-icon'><DownloadIcon /></span>
          <h2 className='hiw-page__install-title'>{sc('guide_install_title', 'Add MiaCivezza to Your Phone')}</h2>
          <p className='hiw-page__install-body'>
            {sc('guide_install_body', "On iPhone, open miacivezza.com in Safari, tap the Share button, then \"Add to Home Screen.\" You'll get an icon that opens straight to MiaCivezza — no bookmarks or extra taps needed. (Other browsers may not support this the same way — Safari is the one we've confirmed works.)")}
          </p>
        </div>

        <div className='hiw-page__install-illustrations'>
          <div className='hiw-phone-mock'>
            <div className='hiw-phone-mock__screen'>
              <div className='hiw-phone-mock__app hiw-phone-mock__app--dim' />
              <div className='hiw-phone-mock__app hiw-phone-mock__app--dim' />
              <div className='hiw-phone-mock__app hiw-phone-mock__app--dim' />
              <div className='hiw-phone-mock__app hiw-phone-mock__app--real'>
                {server?.item?.thumbnail?.url && (
                  <img src={server.item.thumbnail.url} alt='' className='hiw-phone-mock__app-icon' />
                )}
                <span className='hiw-phone-mock__app-label'>MiaCivezza</span>
              </div>
              <div className='hiw-phone-mock__app hiw-phone-mock__app--dim' />
              <div className='hiw-phone-mock__app hiw-phone-mock__app--dim' />
            </div>
          </div>

          <div className='hiw-tap-illustration'>
            <div className='hiw-tap-illustration__icon-wrap'>
              {server?.item?.thumbnail?.url && (
                <img src={server.item.thumbnail.url} alt='' className='hiw-tap-illustration__icon' />
              )}
              <span className='hiw-tap-illustration__ripple' />
            </div>
            <span className='hiw-tap-illustration__arrow'>→</span>
            <div className='hiw-tap-illustration__app-view'>
              <span className='hiw-tap-illustration__app-view-label'>MiaCivezza.com</span>
            </div>
          </div>
        </div>
        <p className='hiw-page__install-caption'>{sc('guide_install_tap_caption', 'One tap, straight in — no browser tabs to dig through.')}</p>
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
