// app/javascript/flavours/glitch/components/community_directory/entry_card.jsx

import { Link } from 'react-router-dom';

import { RelativeTimestamp } from 'flavours/glitch/components/relative_timestamp';
import { Avatar } from 'flavours/glitch/components/avatar';

const humanize = (str) => str ? str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

export const EntryCard = ({ entry, config, featureKey }) => {
  if (!entry) return null;

  const id = entry.get('id');
  const account = entry.get('account');
  const createdAt = entry.get('created_at');

  // Find a display_name field or use the first text field
  const nameField = config.fields.find(f => f.db_name === 'display_name' || f.db_name === 'name' || f.db_name === 'title');
  const displayName = nameField ? entry.get(nameField.db_name) : `${config.display_name} #${id}`;

  // Preview: show first 3 non-name fields that have values
  const previewFields = config.fields
    .filter(f => f.db_name !== nameField?.db_name)
    .slice(0, 3);

  return (
    <div className='community-entry-card'>
      <div className='community-entry-card__header'>
        {account && (
          <div className='community-entry-card__account'>
            <Avatar account={account} size={36} />
            <span className='community-entry-card__username'>
              @{account.get('username')}
            </span>
          </div>
        )}

        {createdAt && (
          <span className='community-entry-card__time'>
            <RelativeTimestamp timestamp={createdAt} />
          </span>
        )}
      </div>

      <Link
        to={`/${featureKey}/${id}`}
        className='community-entry-card__title'
      >
        {displayName || humanize(config.category_key)}
      </Link>

      {previewFields.length > 0 && (
        <div className='community-entry-card__preview'>
          {previewFields.map(field => {
            const rawVal = entry.get(field.db_name);
            if (rawVal == null || rawVal === '') return null;

            const val = rawVal && typeof rawVal.toJS === 'function'
              ? rawVal.toJS().join(', ')
              : String(rawVal);

            const truncated = val.length > 100 ? val.slice(0, 97) + '…' : val;

            return (
              <div key={field.db_name} className='community-entry-card__field'>
                <span className='community-entry-card__field-label'>
                  {field.label || humanize(field.db_name)}:
                </span>{' '}
                <span className='community-entry-card__field-value'>
                  {truncated}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Link to={`/${featureKey}/${id}`} className='community-entry-card__view-link'>
        View details →
      </Link>
    </div>
  );
};
