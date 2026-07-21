import { useState, useEffect, useCallback } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { useIntl } from 'react-intl';

import { Map as ImmutableMap } from 'immutable';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useViewingLocale } from 'flavours/glitch/hooks/useViewingLocale';
import api from 'flavours/glitch/api';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';
import { directCompose } from 'flavours/glitch/actions/compose';
import {
  fetchListing, refreshListing, deleteListing,
  fulfillListing, closeListing,
  addInterest, removeInterest,
} from 'flavours/glitch/actions/community_listings';

const TYPE_LABELS = {
  giveaway: 'Giveaway', trade: 'Trade', sell: 'Sell', rent: 'Rent', iso: 'ISO',
};

const STATUS_LABELS = {
  open: null, fulfilled: 'Fulfilled', closed: 'Closed',
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const fmtPrice = (listing) => {
  if (!listing.price) return null;
  const amt = parseFloat(listing.price).toLocaleString('it-IT', { style: 'currency', currency: listing.currency || 'EUR' });
  return listing.listing_type === 'rent' && listing.rental_period
    ? `${amt} / ${listing.rental_period}` : amt;
};

const InterestModal = ({ listing, onClose, onSubmitted }) => {
  const dispatch  = useAppDispatch();
  const [message, setMessage] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await dispatch(addInterest(listing.id, message));
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong');
      setSaving(false);
    }
  }, [dispatch, listing.id, message, onSubmitted]);

  return (
    <div className='cv-modal' onClick={onClose}>
      <div className='cv-modal__card cl-interest-modal' onClick={e => e.stopPropagation()}>
        <div className='cl-interest-modal__title'>Express Interest</div>
        <div className='cl-interest-modal__listing'>"{listing.title}"</div>
        <form onSubmit={handleSubmit}>
          <textarea
            className='cl-interest-modal__msg'
            placeholder='Optional message to the owner… (140 chars max)'
            maxLength={140}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          {error && <div className='cl-interest-modal__error'>{error}</div>}
          <div className='cl-interest-modal__actions'>
            <button type='button' className='button button-secondary' onClick={onClose}>Cancel</button>
            <button type='submit' className='button' disabled={saving}>
              {saving ? 'Sending…' : "I'm Interested"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InterestQueue = ({ interests, listingId, onRefresh }) => {
  const dispatch = useAppDispatch();
  const [working, setWorking] = useState(null);

  const handle = useCallback(async (action, interestId) => {
    setWorking(interestId);
    try {
      await action();
      onRefresh();
    } finally {
      setWorking(null);
    }
  }, [onRefresh]);

  const handleSendDm = useCallback((username) => {
    dispatch(directCompose(ImmutableMap({ acct: username })));
  }, [dispatch]);

  if (!interests?.length) return <div className='cl-interests__empty'>No one has expressed interest yet.</div>;

  return (
    <div className='cl-interests'>
      <div className='cl-interests__title'>{interests.length} interested</div>
      {interests.map(i => (
        <div key={i.id} className={`cl-interests__row cl-interests__row--${i.status}`}>
          <img src={i.account.avatar} alt='' className='cl-interests__avatar' />
          <div className='cl-interests__info'>
            <span className='cl-interests__name'>
              {i.account.display_name || i.account.username}
            </span>
            <span className='cl-interests__handle'>@{i.account.username}</span>
            {i.message && <div className='cl-interests__msg'>"{i.message}"</div>}
          </div>
          <div className='cl-interests__actions'>
            <button
              type='button'
              onClick={() => handleSendDm(i.account.username)}
              className='button button-secondary cl-interests__dm-btn'
            >
              Send DM
            </button>
            {i.status === 'pending' && (
              <>
                <button
                  className='cl-interests__select-btn'
                  disabled={!!working}
                  onClick={() => handle(() => api().put(`/api/v1/community_listings/${listingId}/interests/${i.id}/select`), i.id)}
                >
                  Select
                </button>
                <button
                  className='cl-interests__dismiss-btn'
                  disabled={!!working}
                  onClick={() => handle(() => api().put(`/api/v1/community_listings/${listingId}/interests/${i.id}/dismiss`), i.id)}
                >
                  Dismiss
                </button>
              </>
            )}
            {i.status === 'selected'  && <span className='cl-interests__status-badge cl-interests__status-badge--selected'>Selected</span>}
            {i.status === 'dismissed' && <span className='cl-interests__status-badge cl-interests__status-badge--dismissed'>Dismissed</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

const CommunityListingsShow = ({ multiColumn, params }) => {
  const dispatch = useAppDispatch();
  const { signedIn, permissions } = useIdentity();
  const isAdmin = !!(permissions & 0x1);
  const history = useHistory();
  const intl = useIntl();
  const { viewingLocale } = useViewingLocale();
  const activeLocale = (viewingLocale || intl.locale || 'en').split('-')[0];

  const id = String(params?.id);
  const cached = useAppSelector(s => s.getIn(['community_listings', 'byId', id]));

  const [loading,      setLoading]      = useState(!cached);
  const [showInterest, setShowInterest] = useState(false);
  const [activeImg,    setActiveImg]    = useState(0);

  useEffect(() => {
    if (cached) return;
    setLoading(true);
    dispatch(fetchListing(id)).finally(() => setLoading(false));
  }, [dispatch, id, cached]);

  const listing = cached?.toJS();

  const handleInterestSubmitted = useCallback(() => {
    setShowInterest(false);
  }, []);

  const handleWithdraw = useCallback(async () => {
    await dispatch(removeInterest(id));
  }, [dispatch, id]);

  // The old "Send DM" link pointed at /compose, which isn't a registered
  // route (the real compose route is /publish) -- and even if it had been,
  // text=@username alone doesn't set visibility, so it would have posted
  // publicly rather than sending an actual direct message. directCompose
  // is the same action Mastodon's own "Mention"/"Message" buttons use
  // elsewhere -- it sets privacy: 'direct' and navigates to the compose UI.
  const handleSendDm = useCallback(() => {
    if (!listing?.account?.username) return;
    dispatch(directCompose(ImmutableMap({ acct: listing.account.username })));
  }, [dispatch, listing?.account?.username]);

  const handleFulfill = useCallback(async () => {
    await dispatch(fulfillListing(id));
  }, [dispatch, id]);

  const handleClose = useCallback(async () => {
    await dispatch(closeListing(id));
  }, [dispatch, id]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this listing?')) return;
    await dispatch(deleteListing(id));
    history.push('/community_listings');
  }, [dispatch, id, history]);

  const handleRefreshInterests = useCallback(() => {
    dispatch(refreshListing(id));
  }, [dispatch, id]);

  if (loading) return <Column><LoadingIndicator /></Column>;
  if (!listing) return <Column><div style={{ padding: 20 }}>Listing not found.</div></Column>;

  const isOwn       = listing.is_own;
  // Admins can manage (edit/fulfill/close/delete) any entry, matching the
  // authorize_owner! bypass already present server-side -- the UI just
  // never surfaced it before.
  const canManage   = isOwn || isAdmin;
  const isOpen      = listing.status === 'open';
  const price       = fmtPrice(listing);
  const statusLabel = STATUS_LABELS[listing.status];

  // Resolve translated text: viewing locale → base lang → original
  const tr = (field) => {
    const ts = listing.translations || {};
    return ts[activeLocale]?.[field] || ts[activeLocale.split('-')[0]]?.[field] || listing[field];
  };

  return (
    <Column>
      <ColumnHeader icon='tag' title='Listing' multiColumn={multiColumn} />
      <Helmet><title>{listing.title} · miacivezza</title></Helmet>

      {showInterest && (
        <InterestModal
          listing={listing}
          onClose={() => setShowInterest(false)}
          onSubmitted={handleInterestSubmitted}
        />
      )}

      <div className='cl-detail'>
        <Link to='/community_listings' className='cl-detail__back'>← All Listings</Link>

        {statusLabel && (
          <div className='cl-detail__status-banner'>{statusLabel}</div>
        )}

        {listing.images?.length > 0 && (
          <div className='cl-detail__gallery'>
            <img
              src={listing.images[activeImg]}
              alt={listing.title}
              className='cl-detail__main-img'
              loading='eager'
            />
            {listing.images.length > 1 && (
              <div className='cl-detail__thumbs'>
                {listing.images.map((img, i) => {
                  const thumbSrc = listing.image_previews?.[i] ?? img;
                  return (
                    <img
                      key={i}
                      src={thumbSrc}
                      alt=''
                      className={`cl-detail__thumb${activeImg === i ? ' cl-detail__thumb--active' : ''}`}
                      onClick={() => setActiveImg(i)}
                      loading='lazy'
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className='cl-detail__body'>
          <div className={`cl-detail__type-badge cl-detail__type-badge--${listing.listing_type}`}>
            {TYPE_LABELS[listing.listing_type]}
          </div>

          <h1 className='cl-detail__title'>{tr('title')}</h1>

          {price && <div className='cl-detail__price'>{price}</div>}

          {listing.listing_type === 'trade' && listing.trade_for && (
            <div className='cl-detail__trade-for'>
              <strong>Looking for:</strong> {tr('trade_for')}
            </div>
          )}

          {listing.condition && (
            <div className='cl-detail__condition'>
              Condition: <strong>{listing.condition.replace('_', ' ')}</strong>
            </div>
          )}

          {listing.description && (
            <div className='cl-detail__description'>{tr('description')}</div>
          )}

          {listing.location && (
            <div className='cl-detail__location'>📍 {listing.location}</div>
          )}

          <div className='cl-detail__meta'>
            <img src={listing.account.avatar} alt='' className='cl-detail__avatar' />
            <div>
              <div className='cl-detail__display-name'>
                {listing.account.display_name || listing.account.username}
              </div>
              <div className='cl-detail__posted'>Posted {fmtDate(listing.created_at)}</div>
            </div>
          </div>

          {signedIn && !canManage && isOpen && (
            <div className='cl-detail__actions'>
              {listing.interested ? (
                <>
                  <div className='cl-detail__interested-msg'>✓ You expressed interest</div>
                  <button className='button button-secondary' onClick={handleWithdraw}>Withdraw</button>
                </>
              ) : (
                <button className='button' onClick={() => setShowInterest(true)}>
                  I'm Interested
                </button>
              )}
              <button type='button' onClick={handleSendDm} className='button button-secondary'>
                Send DM
              </button>
            </div>
          )}

          {canManage && (
            <div className='cl-detail__owner-actions'>
              {isOpen && (
                <>
                  <Link to={`/community_listings/${listing.id}/edit`} className='button button-secondary'>Edit</Link>
                  <button className='button button-secondary' onClick={handleFulfill}>Mark as Fulfilled</button>
                  <button className='button button-secondary' onClick={handleClose}>Close</button>
                </>
              )}
              <button className='cl-detail__delete-btn' onClick={handleDelete}>Delete</button>
            </div>
          )}
        </div>

        {canManage && (
          <InterestQueue
            interests={listing.interests}
            listingId={listing.id}
            onRefresh={handleRefreshInterests}
          />
        )}
      </div>
    </Column>
  );
};

export default CommunityListingsShow;
