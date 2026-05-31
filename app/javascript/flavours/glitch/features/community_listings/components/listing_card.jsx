import { Link } from 'react-router-dom';

const TYPE_COLORS = {
  giveaway: { bg: '#e8f5e9', color: '#2e7d32', label: 'Giveaway' },
  trade:    { bg: '#e3f2fd', color: '#1565c0', label: 'Trade' },
  sell:     { bg: '#fff3e0', color: '#e65100', label: 'Sell' },
  rent:     { bg: '#f3e5f5', color: '#6a1b9a', label: 'Rent' },
  iso:      { bg: '#fce4ec', color: '#880e4f', label: 'ISO' },
};

const fmtPrice = (listing) => {
  if (!listing.price) return null;
  const amt = parseFloat(listing.price).toLocaleString('it-IT', { style: 'currency', currency: listing.currency || 'EUR' });
  return listing.listing_type === 'rent' && listing.rental_period
    ? `${amt} / ${listing.rental_period}`
    : amt;
};

export const ListingCard = ({ listing }) => {
  const meta  = TYPE_COLORS[listing.listing_type] ?? { bg: '#f5f5f5', color: '#555', label: listing.listing_type };
  const price = fmtPrice(listing);
  const thumb = listing.image_previews?.[0] ?? listing.images?.[0];

  return (
    <Link to={`/community_listings/${listing.id}`} className='cl-card'>
      {thumb ? (
        <div className='cl-card__img-wrap'>
          <img src={thumb} alt={listing.title} className='cl-card__img' loading='lazy' />
        </div>
      ) : (
        <div className='cl-card__img-wrap cl-card__img-wrap--empty'>
          <span className='cl-card__no-img'>📦</span>
        </div>
      )}

      <div className='cl-card__body'>
        <div className='cl-card__top'>
          <span className='cl-card__type-badge'
            style={{ background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
          {price && <span className='cl-card__price'>{price}</span>}
        </div>

        <div className='cl-card__title'>{listing.title}</div>

        {listing.description && (
          <div className='cl-card__desc'>
            {listing.description.length > 80
              ? listing.description.slice(0, 80) + '…'
              : listing.description}
          </div>
        )}

        <div className='cl-card__footer'>
          <img src={listing.account.avatar} alt='' className='cl-card__avatar' />
          <span className='cl-card__username'>
            {listing.account.display_name || listing.account.username}
          </span>
          {listing.location && (
            <span className='cl-card__location'>· {listing.location}</span>
          )}
          {listing.interest_count > 0 && (
            <span className='cl-card__interest-count'>
              {listing.interest_count} interested
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
