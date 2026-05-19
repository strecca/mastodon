// app/javascript/flavours/glitch/features/community_hub/index.jsx
//
// Public landing page for the Community Directory system.
// Shows a scrolling grid of category cards (Community Artists, Community Events, etc.)
// Anyone can see this page — it's the main entry point to all community features.
// Route: /community

import { useEffect, useState, useCallback, useRef } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import CategoryIcon from '@/material-icons/400-24px/category.svg?react';
import GroupsIcon from '@/material-icons/400-24px/group.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import api from 'flavours/glitch/api';

const messages = defineMessages({
  title: { id: 'community_hub.title', defaultMessage: 'Community Directory' },
  subtitle: { id: 'community_hub.subtitle', defaultMessage: 'Explore everything our community has to offer' },
  empty: { id: 'community_hub.empty', defaultMessage: 'No community directories have been set up yet. Check back soon!' },
  entries: { id: 'community_hub.entries', defaultMessage: '{count, plural, one {# entry} other {# entries}}' },
  explore: { id: 'community_hub.explore', defaultMessage: 'Browse' },
});

// Icon map — maps icon names from config to Material icon components
// Falls back to CategoryIcon for unknown icons
const ICON_MAP = {
  category: CategoryIcon,
  group: GroupsIcon,
};

const CommunityHub = ({ multiColumn }) => {
  const intl = useIntl();
  const column = useRef(null);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api().get('/api/v1/community_directory_public')
      .then(response => {
        setCategories(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err?.message || 'Failed to load directories');
        setLoading(false);
      });
  }, []);

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
          </div>

          {loading ? (
            <LoadingIndicator />
          ) : error ? (
            <div className='empty-column-indicator'>
              <p>{error}</p>
            </div>
          ) : categories.length > 0 ? (
            <div className='community-hub__grid'>
              {categories.map(cat => (
                <CategoryCard
                  key={cat.name}
                  category={cat}
                  intl={intl}
                />
              ))}
            </div>
          ) : (
            <div className='empty-column-indicator'>
              {intl.formatMessage(messages.empty)}
            </div>
          )}
        </div>
      </div>

      <Helmet>
        <title>{title}</title>
        <meta name='description' content={intl.formatMessage(messages.subtitle)} />
      </Helmet>
    </Column>
  );
};

const CategoryCard = ({ category, intl }) => {
  const IconComponent = ICON_MAP[category.icon] || CategoryIcon;
  const count = category.entries_count || 0;

  return (
    <Link to={category.route} className='community-hub__card'>
      <div className='community-hub__card-icon'>
        <IconComponent />
      </div>

      <div className='community-hub__card-body'>
        <h3 className='community-hub__card-name'>
          {category.display_name}
        </h3>

        {category.description && (
          <p className='community-hub__card-desc'>
            {category.description}
          </p>
        )}

        <span className='community-hub__card-count'>
          {intl.formatMessage(messages.entries, { count })}
        </span>
      </div>

      <span className='community-hub__card-action'>
        {intl.formatMessage(messages.explore)} →
      </span>
    </Link>
  );
};

export default CommunityHub;
