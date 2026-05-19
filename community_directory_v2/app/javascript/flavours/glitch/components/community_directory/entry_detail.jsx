// app/javascript/flavours/glitch/components/community_directory/entry_detail.jsx

import { useEffect, useCallback } from 'react';

import { useIntl, defineMessages } from 'react-intl';
import { Link } from 'react-router-dom';

import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { RelativeTimestamp } from 'flavours/glitch/components/relative_timestamp';
import { Avatar } from 'flavours/glitch/components/avatar';
import { identityContextPropShape, withIdentity } from 'flavours/glitch/identity_context';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import { fetchEntry, clearCurrentEntry } from 'flavours/glitch/actions/community_entries';

const messages = defineMessages({
  edit: { id: 'community.detail.edit', defaultMessage: 'Edit this entry' },
  back: { id: 'community.detail.back', defaultMessage: 'Back to listing' },
  added: { id: 'community.detail.added', defaultMessage: 'Added' },
  updated: { id: 'community.detail.updated', defaultMessage: 'Updated' },
});

const humanize = (str) => str ? str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const EntryDetailInner = ({ config, entryId, multiColumn, identity }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();

  const categoryKey = config.category_key;
  const apiEndpoint = config.api_endpoint;
  const featureKey = `community_${categoryKey}`;

  const catState = useAppSelector(state => state.community_entries.get(categoryKey));
  const entry = catState?.get('currentEntry');
  const loading = catState?.get('currentEntryLoading') || false;
  const error = catState?.get('error');

  useEffect(() => {
    if (entryId) {
      dispatch(fetchEntry(categoryKey, apiEndpoint, entryId));
    }
    return () => dispatch(clearCurrentEntry(categoryKey));
  }, [dispatch, categoryKey, apiEndpoint, entryId]);

  const { signedIn } = identity;

  if (loading || !entry) {
    return loading ? <LoadingIndicator /> : null;
  }

  if (error) {
    return (
      <div className='scrollable'>
        <div className='empty-column-indicator'>
          <p>{error}</p>
          <Link to={`/${featureKey}`} className='button button-secondary'>
            {intl.formatMessage(messages.back)}
          </Link>
        </div>
      </div>
    );
  }

  const account = entry.get('account');
  const createdAt = entry.get('created_at');
  const updatedAt = entry.get('updated_at');
  const isOwner = signedIn && account && identity?.accountId === String(account.get('id'));

  // Group fields by their group property
  const groupMap = {};
  config.fields.forEach(field => {
    const group = field.group || 'default';
    if (!groupMap[group]) groupMap[group] = [];
    groupMap[group].push(field);
  });

  const groupOrder = config.groups?.length > 0
    ? config.groups.map(g => g.name)
    : Object.keys(groupMap);

  const groupLabels = {};
  if (config.groups) {
    config.groups.forEach(g => { groupLabels[g.name] = g.label; });
  }

  return (
    <div className='scrollable community-entry-detail'>
      <div className='community-entry-detail__nav'>
        <Link to={`/${featureKey}`}>{intl.formatMessage(messages.back)}</Link>
      </div>

      {/* Account + timestamps */}
      <div className='community-entry-detail__meta'>
        {account && (
          <div className='community-entry-detail__account'>
            <Avatar account={account} size={46} />
            <div>
              <strong>{account.get('display_name') || account.get('username')}</strong>
              <span className='community-entry-detail__username'>@{account.get('username')}</span>
            </div>
          </div>
        )}

        <div className='community-entry-detail__timestamps'>
          {createdAt && <span>{intl.formatMessage(messages.added)} <RelativeTimestamp timestamp={createdAt} /></span>}
          {updatedAt && updatedAt !== createdAt && (
            <span> · {intl.formatMessage(messages.updated)} <RelativeTimestamp timestamp={updatedAt} /></span>
          )}
        </div>
      </div>

      {/* Fields grouped and laid out */}
      {groupOrder.map(groupName => {
        const groupFields = groupMap[groupName];
        if (!groupFields) return null;

        const label = groupLabels[groupName] || humanize(groupName);

        return (
          <div key={groupName} className='community-entry-detail__group'>
            {groupName !== 'default' && (
              <h3 className='community-entry-detail__group-title'>{label}</h3>
            )}

            <div className='community-entry-detail__fields'>
              {groupFields.map(field => {
                const rawVal = entry.get(field.db_name);
                if (rawVal == null || rawVal === '') return null;

                const val = rawVal && typeof rawVal.toJS === 'function'
                  ? rawVal.toJS().join(', ')
                  : String(rawVal);

                const colClass = field.column === '1' || field.column === '2'
                  ? 'community-entry-detail__field--half'
                  : 'community-entry-detail__field--full';

                return (
                  <div key={field.db_name} className={`community-entry-detail__field ${colClass}`}>
                    <dt className='community-entry-detail__field-label'>
                      {field.label || humanize(field.db_name)}
                    </dt>
                    <dd className='community-entry-detail__field-value'>{val}</dd>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Edit button for owner */}
      {isOwner && (
        <div className='community-entry-detail__actions'>
          <Link to={`/${featureKey}/${entryId}/edit`} className='button'>
            {intl.formatMessage(messages.edit)}
          </Link>
        </div>
      )}
    </div>
  );
};

export const EntryDetail = withIdentity(EntryDetailInner);
