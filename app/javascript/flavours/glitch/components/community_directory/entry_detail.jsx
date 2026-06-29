// app/javascript/flavours/glitch/components/community_directory/entry_detail.jsx

import { useEffect, useCallback, useState } from 'react';

import { useIntl, defineMessages } from 'react-intl';
import { Link, useHistory } from 'react-router-dom';

import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { RelativeTimestamp } from 'flavours/glitch/components/relative_timestamp';
import { Avatar } from 'flavours/glitch/components/avatar';
import { withIdentity } from 'flavours/glitch/identity_context';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import { fetchEntry, clearCurrentEntry, deleteEntry } from 'flavours/glitch/actions/community_entries';
import { fieldLabel, translatedValue } from './translation_helpers';

const messages = defineMessages({
  edit:          { id: 'community.detail.edit',          defaultMessage: 'Edit this entry' },
  delete:        { id: 'community.detail.delete',        defaultMessage: 'Delete' },
  deleteConfirm: { id: 'community.detail.delete_confirm', defaultMessage: 'Permanently delete this entry? This cannot be undone.' },
  back:          { id: 'community.detail.back',          defaultMessage: '← Back' },
  added:         { id: 'community.detail.added',         defaultMessage: 'Added' },
  updated:       { id: 'community.detail.updated',       defaultMessage: 'Updated' },
});

const humanize = (str) => str ? str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const fmtFieldDate = (iso) => {
  if (!iso) return iso;
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const EntryDetailInner = ({ config, entryId, identity }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();

  const history     = useHistory();
  const locale      = intl.locale;
  const categoryKey = config.category_key;
  const apiEndpoint = config.api_endpoint;
  const featureKey  = `community_${categoryKey}`;

  const catState = useAppSelector(state => state.community_entries.get(categoryKey));
  const entry   = catState?.get('currentEntry');
  const loading = catState?.get('currentEntryLoading') || false;
  const error   = catState?.get('error');

  useEffect(() => {
    if (entryId) dispatch(fetchEntry(categoryKey, apiEndpoint, entryId));
    return () => dispatch(clearCurrentEntry(categoryKey));
  }, [dispatch, categoryKey, apiEndpoint, entryId]);

  const { signedIn } = identity;
  const isAdmin = !!(identity.permissions & 0x1);

  const [lightboxUrl, setLightboxUrl] = useState(null);

  const openLightbox  = useCallback((url) => setLightboxUrl(url), []);
  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

  const handleLightboxKeyDown = useCallback((e) => {
    if (e.key === 'Escape') closeLightbox();
  }, [closeLightbox]);

  const handleDelete = useCallback(() => {
    if (!window.confirm(intl.formatMessage(messages.deleteConfirm))) return;
    dispatch(deleteEntry(categoryKey, apiEndpoint, entryId)).then(() => {
      history.push(`/${featureKey}`);
    });
  }, [dispatch, intl, categoryKey, apiEndpoint, entryId, featureKey, history]);

  if (error && !entry) {
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

  if (loading || !entry) return loading ? <LoadingIndicator /> : null;

  const account   = entry.get('account');
  const createdAt = entry.get('created_at');
  const updatedAt = entry.get('updated_at');
  const isOwner   = signedIn && account && (identity?.accountId === String(account.get('id')) || isAdmin);

  // ── Hero data ────────────────────────────────────────────────
  const firstName    = entry.get('first_name');
  const lastName     = entry.get('last_name');
  const hasNameParts = firstName || lastName;

  const nameField = !hasNameParts && config.fields.find(f =>
    ['display_name', 'name', 'title'].includes(f.db_name),
  );

  const displayName = hasNameParts
    ? [firstName, lastName].filter(Boolean).join(' ')
    : nameField
      ? (entry.get(nameField.db_name) || config.display_name)
      : config.display_name;

  const badgeFields = config.fields.filter(f =>
    f.show_in_detail !== false &&
    ['checkboxes', 'select', 'radio'].includes(f.widget),
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

  // First field whose db_name contains a location keyword
  const locationField = config.fields.find(f =>
    ['location', 'town', 'city'].some(k => f.db_name.toLowerCase().includes(k)) &&
    !['checkboxes', 'select', 'radio'].includes(f.widget),
  );
  const locationVal = locationField && entry.get(locationField.db_name);

  // Image gallery — originals for links, previews (:small ~400px) for display
  const images = (() => {
    const raw = entry.get('images');
    if (!raw) return [];
    return typeof raw.toJS === 'function' ? raw.toJS() : Array.isArray(raw) ? raw : [];
  })();

  const imagePreviews = (() => {
    const raw = entry.get('image_previews');
    if (!raw) return [];
    return typeof raw.toJS === 'function' ? raw.toJS() : Array.isArray(raw) ? raw : [];
  })();

  // Fields absorbed into the hero — excluded from body field list
  const heroDbNames = new Set([
    'first_name', 'last_name',
    nameField?.db_name,
    locationField?.db_name,
    ...badgeFields.map(f => f.db_name),
  ].filter(Boolean));

  // ── Group fields for body ────────────────────────────────────
  const visibleFields = config.fields.filter(f =>
    f.show_in_detail !== false && !heroDbNames.has(f.db_name) && f.widget !== 'images',
  );
  const groupMap = {};
  visibleFields.forEach(field => {
    const group = field.group || 'default';
    if (!groupMap[group]) groupMap[group] = [];
    groupMap[group].push(field);
  });

  const groupOrder = config.groups?.length > 0
    ? config.groups.map(g => g.name)
    : Object.keys(groupMap);

  const groupLabels = {};
  if (config.groups) {
    const lang = locale?.split('-')[0];
    config.groups.forEach(g => {
      groupLabels[g.name] = g[`label_${locale}`] || g[`label_${lang}`] || g.label;
    });
  }

  return (
    <div className='scrollable'>
      <div className='community-entry-detail'>

        {/* ── Persistent category banner ── */}
        <Link to='/landing' className='community-category-banner'>
          Click here to see All Community Categories
        </Link>

        {/* ── Hero: hills landscape + name/badges/location ── */}
        <div className='community-entry-detail__hero'>
          <div className='community-entry-detail__sun' />
          <div className='community-entry-detail__hills'>
            <div className='community-entry-detail__hill community-entry-detail__hill--1' />
            <div className='community-entry-detail__hill community-entry-detail__hill--2' />
            <div className='community-entry-detail__hill community-entry-detail__hill--3' />
            <div className='community-entry-detail__hill community-entry-detail__hill--4' />
          </div>
          <div className='community-entry-detail__filter' />

          <div className='community-entry-detail__hero-nav'>
            <Link to={`/${featureKey}`}>{intl.formatMessage(messages.back)}</Link>
          </div>

          <div className='community-entry-detail__hero-content'>
            {badges.length > 0 && (
              <div className='community-entry-detail__badges'>
                {badges.map((v, i) => (
                  <span key={i} className='community-entry-detail__badge'>{v}</span>
                ))}
              </div>
            )}
            <h1 className='community-entry-detail__display-name'>{displayName}</h1>
            {locationVal && (
              <div className='community-entry-detail__location'>{String(locationVal)}</div>
            )}
          </div>
        </div>

        {/* ── Card body ── */}
        <div className='community-entry-detail__card'>

          {/* Account row */}
          {account && (
            <div className='community-entry-detail__account'>
              <Avatar account={account} size={34} />
              <div className='community-entry-detail__account-info'>
                <strong>{account.get('display_name') || account.get('username')}</strong>
                <span className='community-entry-detail__username'>@{account.get('username')}</span>
              </div>
              <div className='community-entry-detail__timestamps'>
                {createdAt && (
                  <span>{intl.formatMessage(messages.added)} <RelativeTimestamp timestamp={createdAt} /></span>
                )}
                {updatedAt && updatedAt !== createdAt && (
                  <span> · {intl.formatMessage(messages.updated)} <RelativeTimestamp timestamp={updatedAt} /></span>
                )}
              </div>
            </div>
          )}

          {/* Image gallery — tap to open lightbox, never navigates away */}
          {images.length > 0 && (
            <div className='community-entry-detail__gallery'>
              {images.map((url, i) => (
                <button
                  key={i}
                  type='button'
                  className='community-entry-detail__gallery-item'
                  onClick={() => openLightbox(url)}
                  aria-label='View full size'
                >
                  <img src={imagePreviews[i] || url} alt='' loading='lazy' />
                </button>
              ))}
            </div>
          )}

          {/* Field groups */}
          {groupOrder.map(groupName => {
            const groupFields = groupMap[groupName];
            if (!groupFields || groupFields.length === 0) return null;
            const label = groupLabels[groupName] || (groupName !== 'default' ? humanize(groupName) : null);

            return (
              <div key={groupName} className='community-entry-detail__group'>
                {label && <h3 className='community-entry-detail__group-title'>{label}</h3>}
                <dl className='community-entry-detail__fields'>
                  {groupFields.map(field => {
                    const rawVal = entry.get(field.db_name);
                    if (rawVal == null || rawVal === '') return null;
                    const storedVal = rawVal && typeof rawVal.toJS === 'function'
                      ? rawVal.toJS().join(', ')
                      : String(rawVal);
                    const rawDisplayVal = field.translatable
                      ? (translatedValue(entry, field.db_name, locale) || storedVal)
                      : storedVal;
                    const val = field.widget === 'date' ? fmtFieldDate(rawDisplayVal) : rawDisplayVal;
                    const isLink = field.widget === 'url' || /^https?:\/\//.test(val);
                    const href = isLink && !/^https?:\/\//.test(val) ? `https://${val}` : val;
                    return (
                      <div key={field.db_name} className='community-entry-detail__field'>
                        <dt className='community-entry-detail__field-label'>
                          {fieldLabel(field, locale) || humanize(field.db_name)}
                        </dt>
                        <dd className={`community-entry-detail__field-value${field.widget === 'textarea' ? ' community-entry-detail__field-value--multiline' : ''}`}>
                          {isLink ? (
                            <a href={href} target='_blank' rel='noopener noreferrer' className='community-entry-detail__link'>
                              {val}
                            </a>
                          ) : val}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            );
          })}

          {isOwner && (
            <div className='community-entry-detail__actions'>
              <Link to={`/${featureKey}/${entryId}/edit`} className='button'>
                {intl.formatMessage(messages.edit)}
              </Link>
              {isAdmin && (
                <button
                  type='button'
                  className='button button--destructive'
                  onClick={handleDelete}
                >
                  {intl.formatMessage(messages.delete)}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox overlay */}
      {lightboxUrl && (
        <div
          className='cd-lightbox'
          role='dialog'
          aria-modal='true'
          onClick={closeLightbox}
          onKeyDown={handleLightboxKeyDown}
          tabIndex={-1}
        >
          <button
            type='button'
            className='cd-lightbox__close'
            onClick={closeLightbox}
            aria-label='Close'
          >
            ✕
          </button>
          <img
            className='cd-lightbox__img'
            src={lightboxUrl}
            alt=''
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export const EntryDetail = withIdentity(EntryDetailInner);
