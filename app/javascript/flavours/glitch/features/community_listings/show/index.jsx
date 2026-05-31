import { useState, useEffect, useCallback } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { withIdentity } from 'flavours/glitch/identity_context';
import api from 'flavours/glitch/api';

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
  const [message, setMessage] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api().post(`/api/v1/community_listings/${listing.id}/interests`, { message });
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong');
      setSaving(false);
    }
  }, [listing.id, message, onSubmitted]);

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

const InterestQueue = ({ interests, listingId, onUpdate }) => {
  const handleSelect  = useCallback(async (id) => {
    await api().put(`/api/v1/community_listings/${listingId}/interests/${id}/select`);
    onUpdate();
  }, [listingId, onUpdate]);

  const handleDismiss = useCallback(async (id) => {
    await api().put(`/api/v1/community_listings/${listingId}/interests/${id}/dismiss`);
    onUpdate();
  }, [listingId, onUpdate]);

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
            <a
              href={`/compose?text=@${i.account.username}%20`}
              className='button button-secondary cl-interests__dm-btn'
              target='_blank' rel='noreferrer'
            >
              Send DM
            </a>
            {i.status === 'pending' && (
              <>
                <button className='cl-interests__select-btn' onClick={() => handleSelect(i.id)}>Select</button>
                <button className='cl-interests__dismiss-btn' onClick={() => handleDismiss(i.id)}>Dismiss</button>
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

const CommunityListingsShow = ({ identity, multiColumn, params }) => {
  const [listing,       setListing]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [showInterest,  setShowInterest]  = useState(false);
  const [interested,    setInterested]    = useState(false);
  const [activeImg,     setActiveImg]     = useState(0);
  const history = useHistory();

  const signedIn = identity?.signedIn;
  const id       = params?.id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api().get(`/api/v1/community_listings/${id}`);
      setListing(res.data);
      setInterested(res.data.interested);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleInterestSubmitted = useCallback(() => {
    setShowInterest(false);
    setInterested(true);
    load();
  }, [load]);

  const handleWithdraw = useCallback(async () => {
    await api().delete(`/api/v1/community_listings/${id}/interests`);
    setInterested(false);
    load();
  }, [id, load]);

  const handleFulfill = useCallback(async () => {
    await api().post(`/api/v1/community_listings/${id}/fulfill`);
    load();
  }, [id, load]);

  const handleClose = useCallback(async () => {
    await api().post(`/api/v1/community_listings/${id}/close`);
    load();
  }, [id, load]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this listing?')) return;
    await api().delete(`/api/v1/community_listings/${id}`);
    history.push('/community_listings');
  }, [id, history]);

  if (loading) return <Column><LoadingIndicator /></Column>;
  if (!listing) return <Column><div style={{ padding: 20 }}>Listing not found.</div></Column>;

  const isOwn    = listing.is_own;
  const isOpen   = listing.status === 'open';
  const price    = fmtPrice(listing);
  const statusLabel = STATUS_LABELS[listing.status];

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
            <img src={listing.images[activeImg]} alt={listing.title} className='cl-detail__main-img' />
            {listing.images.length > 1 && (
              <div className='cl-detail__thumbs'>
                {listing.images.map((img, i) => (
                  <img key={i} src={img} alt='' className={`cl-detail__thumb${activeImg === i ? ' cl-detail__thumb--active' : ''}`}
                    onClick={() => setActiveImg(i)} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className='cl-detail__body'>
          <div className='cl-detail__type-badge cl-detail__type-badge--' + listing.listing_type}>
            {TYPE_LABELS[listing.listing_type]}
          </div>

          <h1 className='cl-detail__title'>{listing.title}</h1>

          {price && <div className='cl-detail__price'>{price}</div>}

          {listing.listing_type === 'trade' && listing.trade_for && (
            <div className='cl-detail__trade-for'>
              <strong>Looking for:</strong> {listing.trade_for}
            </div>
          )}

          {listing.condition && (
            <div className='cl-detail__condition'>
              Condition: <strong>{listing.condition.replace('_', ' ')}</strong>
            </div>
          )}

          {listing.description && (
            <div className='cl-detail__description'>{listing.description}</div>
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

          {/* Actions for non-owners */}
          {signedIn && !isOwn && isOpen && (
            <div className='cl-detail__actions'>
              {interested ? (
                <>
                  <div className='cl-detail__interested-msg'>✓ You expressed interest</div>
                  <button className='button button-secondary' onClick={handleWithdraw}>Withdraw</button>
                </>
              ) : (
                <button className='button' onClick={() => setShowInterest(true)}>
                  I'm Interested
                </button>
              )}
              <a
                href={`/compose?text=@${listing.account.username}%20`}
                className='button button-secondary'
                target='_blank' rel='noreferrer'
              >
                Send DM
              </a>
            </div>
          )}

          {/* Owner controls */}
          {isOwn && (
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

        {/* Interest queue — owner only */}
        {isOwn && (
          <InterestQueue
            interests={listing.interests}
            listingId={listing.id}
            onUpdate={load}
          />
        )}
      </div>
    </Column>
  );
};

export default withIdentity(CommunityListingsShow);
