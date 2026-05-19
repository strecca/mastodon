// app/javascript/flavours/glitch/features/community_directory/index.jsx
//
// Admin-only landing page. Shows all generated community categories
// and a button to create a new one.

import { useEffect, useCallback, useRef } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import CategoryIcon from '@/material-icons/400-24px/category.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import { fetchCategories } from '../../actions/community_directory';

const messages = defineMessages({
  title: { id: 'community_directory.title', defaultMessage: 'Community Directory Admin' },
  createNew: { id: 'community_directory.create_new', defaultMessage: 'Create new category' },
  empty: { id: 'community_directory.empty', defaultMessage: 'No categories generated yet. Create your first one.' },
  entries: { id: 'community_directory.entries', defaultMessage: '{count, plural, one {# entry} other {# entries}}' },
  manage: { id: 'community_directory.manage', defaultMessage: 'View' },
});

const CommunityDirectoryAdmin = ({ multiColumn }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const column = useRef(null);

  // Admin actions store response in a simple local approach
  // since this is admin-only, we'll use local state via the reducer
  const categories = useAppSelector(state => {
    // The admin reducer stores categories at community_directory.categories
    const cd = state.get('community_directory');
    return cd?.get('categories');
  });
  const loading = useAppSelector(state => {
    const cd = state.get('community_directory');
    return cd?.get('categoriesLoading') || false;
  });

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleHeaderClick = useCallback(() => {
    column.current?.scrollTop();
  }, []);

  const title = intl.formatMessage(messages.title);

  return (
    <Column bindToDocument={!multiColumn} ref={column} label={title}>
      <ColumnHeader
        icon='cog'
        iconComponent={CategoryIcon}
        title={title}
        onClick={handleHeaderClick}
        multiColumn={multiColumn}
      />

      <div className='scrollable'>
        <div className='community-directory-admin'>
          <div className='community-directory-admin__header'>
            <Link to='/community_directory/admin' className='button'>
              {intl.formatMessage(messages.createNew)}
            </Link>
          </div>

          {loading ? (
            <LoadingIndicator />
          ) : categories && categories.size > 0 ? (
            <div className='community-directory-admin__list'>
              {categories.map((cat, i) => {
                const name = cat.get('name');
                const displayName = cat.get('display_name') || name;
                const count = cat.get('entries_count') || 0;
                const description = cat.get('description') || '';

                return (
                  <div key={name || i} className='community-directory-admin__card'>
                    <div className='community-directory-admin__card-info'>
                      <strong className='community-directory-admin__card-name'>{displayName}</strong>
                      <span className='community-directory-admin__card-slug'>/{`community_${name}`}</span>
                      {description && (
                        <p className='community-directory-admin__card-desc'>{description}</p>
                      )}
                      <span className='community-directory-admin__card-count'>
                        {intl.formatMessage(messages.entries, { count })}
                      </span>
                    </div>
                    <Link to={`/community_${name}`} className='button button-secondary'>
                      {intl.formatMessage(messages.manage)}
                    </Link>
                  </div>
                );
              })}
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
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

export default CommunityDirectoryAdmin;
