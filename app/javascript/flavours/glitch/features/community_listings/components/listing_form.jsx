import { useState, useCallback, useRef } from 'react';

const CONDITIONS = [
  { value: 'new_item',  label: 'New' },
  { value: 'like_new',  label: 'Like New' },
  { value: 'used',      label: 'Used' },
  { value: 'damaged',   label: 'Damaged' },
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

const RENTAL_PERIODS = ['day', 'week', 'month', 'year'];

const LISTING_TYPES = [
  { value: 'giveaway', label: 'Giveaway', desc: 'Free to a good home' },
  { value: 'trade',    label: 'Trade',    desc: 'Exchange for something else' },
  { value: 'sell',     label: 'Sell',     desc: 'For sale at a price' },
  { value: 'rent',     label: 'Rent',     desc: 'Available to rent' },
  { value: 'iso',      label: 'ISO',      desc: 'In Search Of — looking to find' },
];

const MAX_IMAGES = 4;

export const ListingForm = ({ initial, onSubmit, saving }) => {
  const [listingType,   setListingType]   = useState(initial?.listing_type  ?? 'giveaway');
  const [title,         setTitle]         = useState(initial?.title         ?? '');
  const [description,   setDescription]   = useState(initial?.description   ?? '');
  const [price,         setPrice]         = useState(initial?.price         ?? '');
  const [currency,      setCurrency]      = useState(initial?.currency      ?? 'EUR');
  const [rentalPeriod,  setRentalPeriod]  = useState(initial?.rental_period ?? 'month');
  const [tradeFor,      setTradeFor]      = useState(initial?.trade_for     ?? '');
  const [condition,     setCondition]     = useState(initial?.condition     ?? 'used');
  const [location,      setLocation]      = useState(initial?.location      ?? 'Civezza');
  const [newImages,     setNewImages]     = useState([]);   // File objects
  const [previews,      setPreviews]      = useState([]);   // data URLs
  const fileRef = useRef(null);

  const needsPrice    = listingType === 'sell' || listingType === 'rent';
  const needsRental   = listingType === 'rent';
  const needsTrade    = listingType === 'trade';
  const needsCondition = listingType !== 'iso';

  const handleImages = useCallback((e) => {
    const files = Array.from(e.target.files);
    const allowed = MAX_IMAGES - (initial?.images?.length ?? 0) - newImages.length;
    const toAdd = files.slice(0, allowed);
    setNewImages(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  }, [newImages.length, initial?.images?.length]);

  const removeNew = useCallback((idx) => {
    setNewImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('community_listing[listing_type]', listingType);
    fd.append('community_listing[title]',        title.trim());
    fd.append('community_listing[description]',  description.trim());
    fd.append('community_listing[location]',     location.trim());
    if (needsPrice)   fd.append('community_listing[price]',          price);
    if (needsPrice)   fd.append('community_listing[currency]',       currency);
    if (needsRental)  fd.append('community_listing[rental_period]',  rentalPeriod);
    if (needsTrade)   fd.append('community_listing[trade_for]',      tradeFor.trim());
    if (needsCondition) fd.append('community_listing[condition]',    condition);
    newImages.forEach(img => fd.append('community_listing[images][]', img));
    onSubmit(fd);
  }, [listingType, title, description, location, price, currency, rentalPeriod, tradeFor, condition, newImages, needsPrice, needsRental, needsTrade, needsCondition, onSubmit]);

  const existingImages = initial?.images ?? [];
  const totalImages = existingImages.length + newImages.length;

  return (
    <form className='cl-form' onSubmit={handleSubmit}>

      {/* Listing type */}
      <div className='cl-form__field'>
        <label className='cl-form__label'>Type</label>
        <div className='cl-form__type-grid'>
          {LISTING_TYPES.map(t => (
            <button
              key={t.value}
              type='button'
              className={`cl-form__type-btn${listingType === t.value ? ' cl-form__type-btn--active' : ''}`}
              onClick={() => setListingType(t.value)}
            >
              <span className='cl-form__type-btn-label'>{t.label}</span>
              <span className='cl-form__type-btn-desc'>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className='cl-form__field'>
        <label className='cl-form__label' htmlFor='cl-title'>Title <span className='cl-form__required'>*</span></label>
        <input
          id='cl-title'
          className='cl-form__input'
          type='text'
          maxLength={120}
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder='What are you listing?'
        />
      </div>

      {/* Price (sell / rent) */}
      {needsPrice && (
        <div className='cl-form__field cl-form__field--row'>
          <div className='cl-form__field--grow'>
            <label className='cl-form__label' htmlFor='cl-price'>Price <span className='cl-form__required'>*</span></label>
            <input
              id='cl-price'
              className='cl-form__input'
              type='number'
              min='0'
              step='0.01'
              required
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder='0.00'
            />
          </div>
          <div>
            <label className='cl-form__label' htmlFor='cl-currency'>Currency</label>
            <select id='cl-currency' className='cl-form__select' value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {needsRental && (
            <div>
              <label className='cl-form__label' htmlFor='cl-period'>Per</label>
              <select id='cl-period' className='cl-form__select' value={rentalPeriod} onChange={e => setRentalPeriod(e.target.value)}>
                {RENTAL_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Trade for */}
      {needsTrade && (
        <div className='cl-form__field'>
          <label className='cl-form__label' htmlFor='cl-trade-for'>Looking for (what to trade for)</label>
          <input
            id='cl-trade-for'
            className='cl-form__input'
            type='text'
            maxLength={200}
            value={tradeFor}
            onChange={e => setTradeFor(e.target.value)}
            placeholder='e.g. Road bike, vintage camera…'
          />
        </div>
      )}

      {/* Condition (not for ISO) */}
      {needsCondition && (
        <div className='cl-form__field'>
          <label className='cl-form__label'>Condition</label>
          <div className='cl-form__condition-row'>
            {CONDITIONS.map(c => (
              <label key={c.value} className={`cl-form__condition-opt${condition === c.value ? ' cl-form__condition-opt--active' : ''}`}>
                <input
                  type='radio'
                  name='condition'
                  value={c.value}
                  checked={condition === c.value}
                  onChange={() => setCondition(c.value)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <div className='cl-form__field'>
        <label className='cl-form__label' htmlFor='cl-desc'>Description</label>
        <textarea
          id='cl-desc'
          className='cl-form__textarea'
          rows={4}
          maxLength={1000}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder='Describe the item…'
        />
      </div>

      {/* Location */}
      <div className='cl-form__field'>
        <label className='cl-form__label' htmlFor='cl-location'>Location</label>
        <input
          id='cl-location'
          className='cl-form__input'
          type='text'
          maxLength={100}
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder='e.g. Civezza, Imperia…'
        />
      </div>

      {/* Images */}
      <div className='cl-form__field'>
        <label className='cl-form__label'>Photos ({totalImages}/{MAX_IMAGES})</label>

        {existingImages.length > 0 && (
          <div className='cl-form__img-row'>
            {existingImages.map((src, i) => (
              <div key={i} className='cl-form__img-thumb'>
                <img src={src} alt='' />
                <span className='cl-form__img-existing-label'>Existing</span>
              </div>
            ))}
          </div>
        )}

        {previews.length > 0 && (
          <div className='cl-form__img-row'>
            {previews.map((src, i) => (
              <div key={i} className='cl-form__img-thumb'>
                <img src={src} alt='' />
                <button type='button' className='cl-form__img-remove' onClick={() => removeNew(i)}>×</button>
              </div>
            ))}
          </div>
        )}

        {totalImages < MAX_IMAGES && (
          <>
            <button type='button' className='button button-secondary cl-form__add-img-btn'
              onClick={() => fileRef.current?.click()}>
              + Add Photo
            </button>
            <input
              ref={fileRef}
              type='file'
              accept='image/*'
              multiple
              style={{ display: 'none' }}
              onChange={handleImages}
            />
          </>
        )}
      </div>

      {/* Submit */}
      <div className='cl-form__actions'>
        <button type='submit' className='button' disabled={saving}>
          {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Post Listing')}
        </button>
      </div>
    </form>
  );
};
