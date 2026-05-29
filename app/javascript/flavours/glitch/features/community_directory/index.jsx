// Admin landing — lists generated categories, links to moderation and permissions.

import { useEffect, useCallback, useRef, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import CategoryIcon from '@/material-icons/400-24px/category.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import { fetchCategories, fetchSettings, saveSetting } from '../../actions/community_directory';

const messages = defineMessages({
  title:        { id: 'community_directory.title',        defaultMessage: 'Community Directory Admin' },
  createNew:    { id: 'community_directory.create_new',   defaultMessage: 'Create new category' },
  moderation:   { id: 'community_directory.moderation',   defaultMessage: 'Moderation Queue' },
  permissions:  { id: 'community_directory.permissions',  defaultMessage: 'Permissions' },
  scraperLogs:  { id: 'community_directory.scraper_logs', defaultMessage: 'Scraper Logs' },
  empty:        { id: 'community_directory.empty',        defaultMessage: 'No categories generated yet. Create your first one.' },
  entries:      { id: 'community_directory.entries',      defaultMessage: '{count, plural, one {# entry} other {# entries}}' },
  view:         { id: 'community_directory.view',         defaultMessage: 'View' },
  edit:         { id: 'community_directory.edit',         defaultMessage: 'Edit' },
  rateLimits:   { id: 'community_directory.rate_limits',  defaultMessage: 'Rate Limits' },
  maxEntries:   { id: 'community_directory.max_entries',  defaultMessage: 'Max entries per account' },
  periodDays:   { id: 'community_directory.period_days',  defaultMessage: 'Period (days)' },
  requiresApproval: { id: 'community_directory.requires_approval', defaultMessage: 'Require approval for new entries' },
  staleReject:  { id: 'community_directory.stale_reject', defaultMessage: 'Auto-reject after (days)' },
  saveLimits:   { id: 'community_directory.save_limits',  defaultMessage: 'Save limits' },
  unlimited:    { id: 'community_directory.unlimited',    defaultMessage: 'Unlimited' },
  never:        { id: 'community_directory.never',        defaultMessage: 'Never' },
});

const CategoryCard = ({ cat, setting, intl, dispatch }) => {
  const name        = cat.get('name');
  const displayName = cat.get('display_name') || name;
  const count       = cat.get('entries_count') || 0;
  const description = cat.get('description') || '';

  const [maxEntries,        setMaxEntries]        = useState(setting?.get('max_entries_per_account')?.toString() || '');
  const [periodDays,        setPeriodDays]        = useState(setting?.get('period_days')?.toString() || '');
  const [requiresApproval,  setRequiresApproval]  = useState(setting?.get('requires_approval') !== false);
  const [staleRejectDays,   setStaleRejectDays]   = useState(setting?.get('stale_reject_after_days')?.toString() || '');
  const [saving,           setSaving]           = useState(false);

  const handleSaveLimits = useCallback(async () => {
    setSaving(true);
    try {
      await dispatch(saveSetting(name, {
        max_entries_per_account: maxEntries || null,
        period_days:             periodDays || null,
        requires_approval:       requiresApproval,
        stale_reject_after_days: staleRejectDays || null,
      }));
    } finally {
      setSaving(false);
    }
  }, [dispatch, name, maxEntries, periodDays, requiresApproval]);

  return (
    <div className='community-directory-admin__card'>
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

      <div className='community-directory-admin__card-actions'>
        <Link to={`/community_${name}`} className='button button-secondary'>
          {intl.formatMessage(messages.view)}
        </Link>
        <Link to={`/community_directory/edit/${name}`} className='button'>
          {intl.formatMessage(messages.edit)}
        </Link>
      </div>

      <div className='community-directory-admin__rate-limits'>
        <h4 className='community-directory-admin__rate-limits-title'>
          {intl.formatMessage(messages.rateLimits)}
        </h4>

        <div className='community-directory-admin__rate-limits-fields'>
          <label className='community-directory-admin__rate-limit-field'>
            <span>{intl.formatMessage(messages.maxEntries)}</span>
            <input
              type='number'
              min='1'
              value={maxEntries}
              onChange={e => setMaxEntries(e.target.value)}
              placeholder={intl.formatMessage(messages.unlimited)}
              className='community-directory-admin__input'
            />
          </label>

          <label className='community-directory-admin__rate-limit-field'>
            <span>{intl.formatMessage(messages.periodDays)}</span>
            <input
              type='number'
              min='1'
              value={periodDays}
              onChange={e => setPeriodDays(e.target.value)}
              placeholder='30'
              className='community-directory-admin__input'
            />
          </label>

          <label className='community-directory-admin__rate-limit-field'>
            <span>{intl.formatMessage(messages.staleReject)}</span>
            <input
              type='number'
              min='1'
              value={staleRejectDays}
              onChange={e => setStaleRejectDays(e.target.value)}
              placeholder={intl.formatMessage(messages.never)}
              className='community-directory-admin__input'
            />
          </label>

          <label className='community-directory-admin__rate-limit-checkbox'>
            <input
              type='checkbox'
              checked={requiresApproval}
              onChange={e => setRequiresApproval(e.target.checked)}
            />
            {intl.formatMessage(messages.requiresApproval)}
          </label>
        </div>

        <button
          type='button'
          className='button button-secondary community-directory-admin__save-limits'
          onClick={handleSaveLimits}
          disabled={saving}
        >
          {intl.formatMessage(messages.saveLimits)}
        </button>
      </div>
    </div>
  );
};

const CommunityDirectoryAdmin = ({ multiColumn }) => {
  const intl     = useIntl();
  const dispatch = useAppDispatch();
  const column   = useRef(null);

  const categories = useAppSelector(s => s.get('community_directory')?.get('categories'));
  const loading    = useAppSelector(s => s.get('community_directory')?.get('categoriesLoading') || false);
  const settings   = useAppSelector(s => s.get('community_directory')?.get('settings'));

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchSettings());
  }, [dispatch]);

  const handleHeaderClick = useCallback(() => { column.current?.scrollTop(); }, []);

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
            <Link to='/community_directory/moderation' className='button button-secondary'>
              {intl.formatMessage(messages.moderation)}
            </Link>
            <Link to='/community_directory/permissions' className='button button-secondary'>
              {intl.formatMessage(messages.permissions)}
            </Link>
            <Link to='/community_directory/scraper_logs' className='button button-secondary'>
              {intl.formatMessage(messages.scraperLogs)}
            </Link>
          </div>

          {loading ? (
            <LoadingIndicator />
          ) : categories && categories.size > 0 ? (
            <div className='community-directory-admin__list'>
              {categories.map((cat, i) => {
                const name = cat.get('name');
                const setting = settings?.find(s => s.get('category_key') === name);
                return (
                  <CategoryCard
                    key={name || i}
                    cat={cat}
                    setting={setting}
                    intl={intl}
                    dispatch={dispatch}
                  />
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
