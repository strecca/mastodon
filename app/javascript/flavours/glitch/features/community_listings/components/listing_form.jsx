import { useState, useCallback, useRef } from 'react';

import api from 'flavours/glitch/api';

// Canvas draw always outputs sRGB, normalizing any input color profile (ACES, P3, AdobeRGB, etc.)
const compressImage = (file, onStatus) =>
  new Promise((resolve, reject) => {
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > 80) {
      reject(new Error(`Image is too large (${Math.round(sizeMB)} MB). Please resize it to under 80 MB before uploading.`));
      return;
    }
    if (sizeMB > 10) onStatus?.(`Compressing large image (${Math.round(sizeMB)} MB) — please wait…`);
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      if (file.type === 'image/jpeg' && img.width <= 1280 && img.height <= 1280) {
        resolve(file);
        return;
      }
      const scale = Math.min(1, 1280 / img.width, 1280 / img.height);
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg', 0.82,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });

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
  // Unified image list: { mediaId, previewUrl } — covers both saved and newly uploaded
  const [images,      setImages]      = useState(() => {
    const ids      = initial?.image_media_ids  ?? [];
    const previews = initial?.image_previews   ?? [];
    const originals = initial?.images          ?? [];
    return ids.map((id, i) => ({
      mediaId:    String(id),
      previewUrl: previews[i] ?? originals[i] ?? null,
    }));
  });
  const [uploading,     setUploading]     = useState(false);
  const [uploadError,   setUploadError]   = useState(null);
  const [uploadStatus,  setUploadStatus]  = useState(null);
  const fileRef = useRef(null);

  const needsPrice    = listingType === 'sell' || listingType === 'rent';
  const needsRental   = listingType === 'rent';
  const needsTrade    = listingType === 'trade';
  const needsCondition = listingType !== 'iso';

  const handleImages = useCallback(async (e) => {
    const files   = Array.from(e.target.files);
    const allowed = MAX_IMAGES - images.length;
    const toUpload = files.slice(0, allowed);
    e.target.value = '';
    if (!toUpload.length) return;

    setUploading(true);
    setUploadError(null);
    setUploadStatus(null);
    for (const file of toUpload) {
      try {
        const compressed = await compressImage(file, setUploadStatus);
        setUploadStatus(null);
        const fd = new FormData();
        fd.append('file', compressed);
        const res = await api().post('/api/v2/media', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setImages(prev => [...prev, {
          mediaId:    String(res.data.id),
          previewUrl: res.data.url || res.data.preview_url,
        }]);
      } catch (err) {
        setUploadStatus(null);
        setUploadError(err?.message || 'Failed to upload one or more images — please try again.');
      }
    }
    setUploading(false);
  }, [images.length]);

  const removeImage = useCallback((idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('listing[listing_type]', listingType);
    fd.append('listing[title]',        title.trim());
    fd.append('listing[description]',  description.trim());
    fd.append('listing[location]',     location.trim());
    if (needsPrice)    fd.append('listing[price]',          price);
    if (needsPrice)    fd.append('listing[currency]',       currency);
    if (needsRental)   fd.append('listing[rental_period]',  rentalPeriod);
    if (needsTrade)    fd.append('listing[trade_for]',      tradeFor.trim());
    if (needsCondition) fd.append('listing[condition_value]', condition);
    // Always send the complete current media_ids list (empty = remove all)
    images.forEach(img => fd.append('media_ids[]', img.mediaId));
    if (images.length === 0) fd.append('media_ids[]', ''); // signal "replace with empty"
    onSubmit(fd);
  }, [listingType, title, description, location, price, currency, rentalPeriod, tradeFor, condition, images, needsPrice, needsRental, needsTrade, needsCondition, onSubmit]);

  const handleFormKeyDown = useCallback((e) => {
    // Stop Mastodon's global keyboard handler from seeing keystrokes in form fields.
    // For non-textarea inputs, also prevent Enter from submitting the form early.
    e.stopPropagation();
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  }, []);

  return (
    <form className='cl-form' onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>

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

      {/* Images — unified list, every photo has an X */}
      <div className='cl-form__field'>
        <label className='cl-form__label'>Photos ({images.length}/{MAX_IMAGES})</label>

        {images.length > 0 && (
          <div className='cl-form__img-row'>
            {images.map((img, i) => (
              <div key={img.mediaId} className='cl-form__img-thumb'>
                {img.previewUrl
                  ? <img src={img.previewUrl} alt='' loading='lazy' />
                  : <div className='cl-form__img-placeholder'>📷</div>
                }
                <button
                  type='button'
                  className='cl-form__img-remove'
                  onClick={() => removeImage(i)}
                  title='Remove photo'
                >×</button>
              </div>
            ))}
          </div>
        )}

        {uploadError && <div className='cl-form__upload-error'>{uploadError}</div>}

        {images.length < MAX_IMAGES && (
          <>
            <button
              type='button'
              className='button button-secondary cl-form__add-img-btn'
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (uploadStatus || 'Uploading…') : '+ Add Photo'}
            </button>
            <input
              ref={fileRef}
              type='file'
              accept='image/jpeg,image/png,image/webp,image/gif'
              multiple
              style={{ display: 'none' }}
              onChange={handleImages}
            />
          </>
        )}
      </div>

      {/* Submit */}
      <div className='cl-form__actions'>
        <button type='submit' className='button' disabled={saving || uploading}>
          {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Post Listing')}
        </button>
      </div>
    </form>
  );
};
