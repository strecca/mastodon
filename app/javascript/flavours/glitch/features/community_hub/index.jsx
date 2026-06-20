// app/javascript/flavours/glitch/features/community_hub/index.jsx
//
// Public landing page for the Community Directory system.
// Shows a scrolling grid of category cards (Community Artists, Community Events, etc.)
// Anyone can see this page — it's the main entry point to all community features.
// Route: /community

import { useCallback, useRef } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import BrushIcon from '@/material-icons/400-24px/brush.svg?react';
import CelebrationIcon from '@/material-icons/400-24px/celebration.svg?react';
import GroupsIcon from '@/material-icons/400-24px/group.svg?react';
import HomeIcon from '@/material-icons/400-24px/home.svg?react';
import ManufacturingIcon from '@/material-icons/400-24px/manufacturing.svg?react';
import StarIcon from '@/material-icons/400-24px/star.svg?react';
import TagIcon from '@/material-icons/400-24px/tag.svg?react';
import TripIcon from '@/material-icons/400-24px/trip.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';

const messages = defineMessages({
  title: { id: 'community_hub.title', defaultMessage: 'Civezza Community Directory' },
  subtitle: { id: 'community_hub.subtitle', defaultMessage: 'Explore everything our community has to offer' },
  explore: { id: 'community_hub.explore', defaultMessage: 'Browse' },
});

const ORDERED_TILES = [
  { to: '/community_listings',   Icon: TagIcon,           label: 'Community Listings',         desc: 'Giveaway · Trade · Sell · ISO' },
  { to: '/community_events',     Icon: CelebrationIcon,   label: 'Community Events',            desc: "What's happening nearby" },
  { to: '/community_properties', Icon: HomeIcon,          label: 'Community Properties',        desc: 'Houses · Apartments · Rentals' },
  { to: '/community_services',   Icon: ManufacturingIcon, label: 'Community Services',          desc: 'Local businesses & services' },
  { to: '/community_restaurants',Icon: StarIcon,          label: 'Community Restaurants',       desc: 'Dining · Cafés · Trattorias' },
  { to: '/community_artists',    Icon: BrushIcon,         label: 'Community Artists',           desc: 'Local talent & creatives' },
  { to: '/community_visits',     Icon: TripIcon,          label: "Community When I'm In Town",  desc: "See who's visiting · Share your dates" },
];

const CommunityHub = ({ multiColumn }) => {
  const intl = useIntl();
  const column = useRef(null);

  const handleHeaderClick = useCallback(() => {
    column.current?.scrollTop();
  }, []);

  const title = intl.formatMessage(messages.title);

  return (
    <Column bindToDocument={!multiColumn} ref={column} label={title}>
      <ColumnHeader
        icon='address-book'
        iconComponent={GroupsIcon}
        title={title}
        onClick={handleHeaderClick}
        multiColumn={multiColumn}
      />

      <div className='scrollable'>
        <div className='community-hub'>
          <div className='community-hub__intro'>
            <h2 className='community-hub__title'>{title}</h2>
            <p className='community-hub__subtitle'>
              {intl.formatMessage(messages.subtitle)}
            </p>
            <Link to='/public/local' className='button community-hub__posts-btn'>
              See Community Posts
            </Link>
          </div>

          <div className='community-hub__grid'>
            {ORDERED_TILES.map(({ to, Icon, label, desc }) => (
              <Link key={to} to={to} className='community-hub__card'>
                <div className='community-hub__card-icon'>
                  <Icon />
                </div>
                <div className='community-hub__card-body'>
                  <h3 className='community-hub__card-name'>{label}</h3>
                  <p className='community-hub__card-desc'>{desc}</p>
                </div>
                <span className='community-hub__card-action'>{intl.formatMessage(messages.explore)} →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Helmet>
        <title>{title}</title>
        <meta name='description' content={intl.formatMessage(messages.subtitle)} />
      </Helmet>
    </Column>
  );
};

export default CommunityHub;
