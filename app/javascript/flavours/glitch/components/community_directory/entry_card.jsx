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

  const firstName = entry.get('first_name');
  const lastName  = entry.get('last_name');
  const hasNameParts = firstName || lastName;

  const nameField = !hasNameParts && config.fields.find(f =>
    ['display_name', 'name', 'title'].includes(f.db_name),
  );

  const displayName = hasNameParts
    ? [firstName, lastName].filter(Boolean).join(' ')
    : nameField
      ? (entry.get(nameField.db_name) || `${config.display_name} #${id}`)
      : `${config.display_name} #${id}`;

  const badgeFields = config.fields.filter(f =>
    f.show_in_list !== false &&
    ['checkboxes', 'select', 'radio'].includes(f.widget) &&
    !['first_name', 'last_name', nameField?.db_name].includes(f.db_name),
  );

  const badges = [];
  badgeFields.forEach(field => {
    const raw = entry.get(field.db_name);
    if (!raw) return;
    if (raw && typeof raw.toJS === 'function') {
      raw.toJS().forEach(v => v && badges.push(v));
    } else if (raw) {
      badges.push(String(raw));
    }
  });

  const badgeDbNames = new Set(badgeFields.map(f => f.db_name));
  const previewFields = config.fields
    .filter(f => {
      if (f.show_in_list === false) return false;
      if (['first_name', 'last_name', nameField?.db_name].includes(f.db_name)) return false;
      if (badgeDbNames.has(f.db_name)) return false;
      if (['checkboxes', 'select', 'radio'].includes(f.widget)) return false;
      return true;
    })
    .slice(0, 2);

  return (
    <Link to={`/${featureKey}/${id}`} className='community-entry-card'>
      {/* Landscape art header */}
      <div className='community-entry-card__landscape'>
        <div className='community-entry-card__sun' />
        <div className='community-entry-card__hills'>
          <div className='community-entry-card__hill community-entry-card__hill--1' />
          <div className='community-entry-card__hill community-entry-card__hill--2' />
          <div className='community-entry-card__hill community-entry-card__hill--3' />
          <div className='community-entry-card__hill community-entry-card__hill--4' />
        </div>
        <div className='community-entry-card__ocean'>
          <div className='community-entry-card__light-band' />
          <div className='community-entry-card__light-band community-entry-card__light-band--2' />
          <div className='community-entry-card__light-band community-entry-card__light-band--3' />
        </div>
        <div className='community-entry-card__trees'>
          <div className='community-entry-card__tree community-entry-card__tree--1'>
            <div className='community-entry-card__foliage' />
            <div className='community-entry-card__trunk' />
          </div>
          <div className='community-entry-card__tree community-entry-card__tree--2'>
            <div className='community-entry-card__foliage' />
            <div className='community-entry-card__trunk' />
          </div>
          <div className='community-entry-card__tree community-entry-card__tree--3'>
            <div className='community-entry-card__foliage' />
            <div className='community-entry-card__trunk' />
          </div>
        </div>
        <div className='community-entry-card__filter' />
        <div className='community-entry-card__landscape-overlay'>
          {badges.length > 0 && (
            <div className='community-entry-card__badges'>
              {badges.map((v, i) => (
                <span key={i} className='community-entry-card__badge'>{v}</span>
              ))}
            </div>
          )}
          <div className='community-entry-card__name'>{displayName}</div>
        </div>
      </div>

      {/* Card content below the landscape */}
      <div className='community-entry-card__content'>
        {previewFields.length > 0 && (
          <div className='community-entry-card__fields'>
            {previewFields.map(field => {
              const raw = entry.get(field.db_name);
              if (raw == null || raw === '') return null;
              const val = String(raw);
              return (
                <div key={field.db_name} className='community-entry-card__field'>
                  <span className='community-entry-card__field-label'>
                    {field.label || humanize(field.db_name)}
                  </span>
                  <span className='community-entry-card__field-value'>
                    {val.length > 60 ? val.slice(0, 57) + '…' : val}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className='community-entry-card__footer'>
          {account && (
            <>
              <Avatar account={account} size={18} />
              <span className='community-entry-card__username'>@{account.get('username')}</span>
            </>
          )}
          {createdAt && (
            <span className='community-entry-card__time'>
              <RelativeTimestamp timestamp={createdAt} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
