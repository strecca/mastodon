// app/javascript/flavours/glitch/components/community_directory/entry_form.jsx
//
// Shared form component used by generated new/ and edit/ pages.
// Renders fields grouped and laid out in 1 or 2 columns based on config.
// mode='create' | 'edit'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Canvas draw always outputs sRGB, normalizing any input color profile (ACES, P3, AdobeRGB, etc.)
const compressImage = (file, onLargeFile) =>
  new Promise((resolve, reject) => {
    const sizeMB = Math.round(file.size / 1024 / 1024);
    if (sizeMB > 80) {
      const err = new Error('too_large');
      err.sizeMB = sizeMB;
      reject(err);
      return;
    }
    if (sizeMB > 10) onLargeFile?.(sizeMB);
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      if (file.type === 'image/jpeg' && img.width <= 1280 && img.height <= 1280) {
        resolve(file);
        return;
      }
      const scale = Math.min(1, 1280 / img.width, 1280 / img.height);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg', 0.82,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });

const DEFAULT_MAX_IMAGES = 3;

import { useIntl, defineMessages } from 'react-intl';
import { useHistory, Link } from 'react-router-dom';

import api from 'flavours/glitch/api';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { fieldLabel, fieldPlaceholder, optionLabel } from './translation_helpers';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import {
  fetchEntry,
  createEntry,
  updateEntry,
  clearCurrentEntry,
} from 'flavours/glitch/actions/community_entries';

// Fetches active locations once; cached across multiple LocationSelectField mounts.
let _locationsCache = null;
let _locationsFetch = null;
const getLocations = () => {
  if (_locationsCache) return Promise.resolve(_locationsCache);
  if (!_locationsFetch) {
    _locationsFetch = api().get('/api/v1/community_locations').then(res => {
      _locationsCache = res.data;
      return _locationsCache;
    }).catch(() => []);
  }
  return _locationsFetch;
};

const messages = defineMessages({
  submitCreate:     { id: 'community.form.submit_create',    defaultMessage: 'Submit entry' },
  submitEdit:       { id: 'community.form.submit_edit',      defaultMessage: 'Save changes' },
  submitting:       { id: 'community.form.submitting',       defaultMessage: 'Saving…' },
  success:          { id: 'community.form.success',          defaultMessage: 'Saved successfully! Redirecting…' },
  required:         { id: 'community.form.required',         defaultMessage: 'This field is required' },
  cancel:           { id: 'community.form.cancel',           defaultMessage: 'Cancel' },
  selectPlaceholder:{ id: 'community.form.select',           defaultMessage: 'Select…' },
  photosHeading:    { id: 'community.form.photos_heading',   defaultMessage: 'Photos (up to {max})' },
  addPhoto:         { id: 'community.form.add_photo',        defaultMessage: '+ Add Photo' },
  uploading:        { id: 'community.form.uploading',        defaultMessage: 'Uploading…' },
  duplicateWarning: { id: 'community.form.duplicate_warning', defaultMessage: 'A similar entry already exists in this category — it may be a duplicate:' },
  viewEntry:        { id: 'community.form.view_entry',       defaultMessage: 'View entry →' },
  editMyEntry:      { id: 'community.form.edit_my_entry',    defaultMessage: 'Edit my entry' },
  submitAnyway:     { id: 'community.form.submit_anyway',    defaultMessage: 'Submit anyway' },
  compressingLarge: { id: 'community.upload.compressing',    defaultMessage: 'Compressing large image ({mb} MB) — please wait…' },
  imageTooLarge:    { id: 'community.upload.too_large',      defaultMessage: 'Image is too large ({mb} MB). Please resize to under 80 MB before uploading.' },
  uploadFailed:     { id: 'community.upload.failed',         defaultMessage: 'Upload failed — please try again.' },
});

const humanize = (str) => str ? str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

export const EntryForm = ({ config, mode, entryId, multiColumn }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const history = useHistory();

  const categoryKey = config.category_key;
  const apiEndpoint = config.api_endpoint;
  const featureKey = `community_${categoryKey}`;

  const catState = useAppSelector(state => state.community_entries.get(categoryKey));
  const currentEntry = catState?.get('currentEntry');
  const entryLoading = catState?.get('currentEntryLoading') || false;

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [populated, setPopulated] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const checkingDuplicate = useRef(false);

  // Images — populated in edit mode from currentEntry
  const imagesField = useMemo(() => config.fields.find(f => f.widget === 'images'), [config.fields]);
  const hasImagesField = !!imagesField;
  const MAX_CATEGORY_IMAGES = imagesField?.max ?? DEFAULT_MAX_IMAGES;
  const [images, setImages] = useState([]);  // [{ mediaId, previewUrl }]
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileRef = useRef(null);

  // In edit mode, fetch the entry and populate form
  useEffect(() => {
    if (mode === 'edit' && entryId) {
      dispatch(fetchEntry(categoryKey, apiEndpoint, entryId));
    }
    return () => {
      if (mode === 'edit') dispatch(clearCurrentEntry(categoryKey));
    };
  }, [dispatch, mode, categoryKey, apiEndpoint, entryId]);

  useEffect(() => {
    if (mode === 'edit' && currentEntry && !populated) {
      const data = {};
      config.fields.forEach(field => {
        if (field.widget === 'images') return; // handled separately
        const val = currentEntry.get(field.db_name);
        if (val != null) {
          data[field.db_name] = val && typeof val.toJS === 'function' ? val.toJS() : val;
        }
      });
      setFormData(data);

      // Seed images from saved media
      if (hasImagesField) {
        const ids      = currentEntry.get('image_media_ids')?.toJS?.() ?? currentEntry.get('image_media_ids') ?? [];
        const previews = currentEntry.get('image_previews')?.toJS?.()  ?? currentEntry.get('image_previews')  ?? [];
        const originals= currentEntry.get('images')?.toJS?.()          ?? currentEntry.get('images')          ?? [];
        setImages(Array.isArray(ids) ? ids.map((id, i) => ({
          mediaId:    String(id),
          previewUrl: previews[i] ?? originals[i] ?? null,
        })) : []);
      }

      setPopulated(true);
    }
  }, [mode, currentEntry, populated, config.fields, hasImagesField]);

  const handleChange = useCallback((fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setErrors(prev => {
      if (prev[fieldName]) {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      }
      return prev;
    });
  }, []);

  const validate = useCallback(() => {
    const errs = {};
    config.fields.forEach(field => {
      if (!field.required) return;
      const val = formData[field.db_name];
      if (Array.isArray(val)) {
        if (val.length === 0) errs[field.db_name] = intl.formatMessage(messages.required);
      } else if (!val || String(val).trim() === '') {
        errs[field.db_name] = intl.formatMessage(messages.required);
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [config.fields, formData, intl]);

  const handleImageFiles = useCallback(async (e) => {
    const files   = Array.from(e.target.files);
    const allowed = MAX_CATEGORY_IMAGES - images.length;
    const toUpload = files.slice(0, allowed);
    e.target.value = '';
    if (!toUpload.length) return;

    setUploading(true);
    setUploadError(null);
    setUploadStatus(null);
    for (const file of toUpload) {
      try {
        const compressed = await compressImage(file, (mb) => setUploadStatus(intl.formatMessage(messages.compressingLarge, { mb })));
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
        setUploadError(err?.message === 'too_large'
          ? intl.formatMessage(messages.imageTooLarge, { mb: err.sizeMB })
          : intl.formatMessage(messages.uploadFailed));
      }
    }
    setUploading(false);
  }, [images.length, MAX_CATEGORY_IMAGES]);

  const removeImage = useCallback((idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const doSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      let payload;
      if (hasImagesField) {
        // Send as multipart so media_ids[] travels alongside entry fields
        const fd = new FormData();
        Object.entries(formData).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            v.forEach(item => fd.append(`entry[${k}][]`, item));
          } else if (v != null) {
            fd.append(`entry[${k}]`, v);
          }
        });
        if (images.length > 0) {
          images.forEach(img => fd.append('media_ids[]', img.mediaId));
        } else {
          fd.append('media_ids[]', ''); // signal: remove all images
        }
        payload = fd;
      } else {
        payload = formData;
      }

      if (mode === 'create') {
        await dispatch(createEntry(categoryKey, apiEndpoint, payload));
      } else {
        await dispatch(updateEntry(categoryKey, apiEndpoint, entryId, payload));
      }
      setSuccess(true);
      setTimeout(() => {
        history.push(mode === 'create' ? `/${featureKey}` : `/${featureKey}/${entryId}`);
      }, 1000);
    } catch {
      setSubmitting(false);
    }
  }, [mode, dispatch, categoryKey, apiEndpoint, formData, entryId, history, featureKey, hasImagesField, images]);

  const handleSubmit = useCallback(async () => {
    if (!validate() || submitting || checkingDuplicate.current) return;
    setDuplicateWarning(null);

    if (mode === 'create') {
      const textFields = config.fields.filter(f => f.widget === 'text' && f.required);
      if (textFields.length > 0) {
        const checkParams = { category: categoryKey };
        textFields.forEach(f => { checkParams[f.db_name] = formData[f.db_name] || ''; });
        checkingDuplicate.current = true;
        try {
          const res = await api().get('/api/v1/community_directory/duplicate_check', { params: checkParams });
          if (res.data.matches?.length > 0) {
            setDuplicateWarning(res.data.matches);
            checkingDuplicate.current = false;
            return;
          }
        } catch {
          // proceed on API error — don't block the submit
        }
        checkingDuplicate.current = false;
      }
    }

    doSubmit();
  }, [validate, submitting, mode, config.fields, categoryKey, formData, doSubmit]);

  const handleSubmitAnyway = useCallback(() => {
    setDuplicateWarning(null);
    doSubmit();
  }, [doSubmit]);

  // Group fields by their group property
  const groupedFields = useMemo(() => {
    const map = {};
    config.fields.forEach(field => {
      const group = field.group || 'default';
      if (!map[group]) map[group] = [];
      map[group].push(field);
    });
    return map;
  }, [config.fields]);

  const groupOrder = config.groups?.length > 0
    ? config.groups.map(g => g.name)
    : Object.keys(groupedFields);

  const groupLabels = {};
  const groupColumns = {};
  if (config.groups) {
    config.groups.forEach(g => {
      groupLabels[g.name] = g.label;
      groupColumns[g.name] = g.columns || 1;
    });
  }

  // Loading state for edit mode
  if (mode === 'edit' && (entryLoading || (!currentEntry && !populated))) {
    return <div className='scrollable'><LoadingIndicator /></div>;
  }

  const cancelPath = mode === 'edit' ? `/${featureKey}/${entryId}` : `/${featureKey}`;

  return (
    <div className='scrollable community-entry-form'>
      {success && (
        <div className='community-entry-form__success'>
          {intl.formatMessage(messages.success)}
        </div>
      )}

      {/* Image upload — shown once above the field groups if config has images widget */}
      {hasImagesField && (
        <div className='community-entry-form__group'>
          <legend className='community-entry-form__group-title'>{intl.formatMessage(messages.photosHeading, { max: MAX_CATEGORY_IMAGES })}</legend>
          <div className='community-entry-form__image-row'>
            {images.map((img, idx) => (
              <div key={img.mediaId} className='community-entry-form__image-thumb'>
                <img src={img.previewUrl} alt='' />
                <button type='button' className='community-entry-form__image-remove' onClick={() => removeImage(idx)} aria-label='Remove photo'>×</button>
              </div>
            ))}
            {images.length < MAX_CATEGORY_IMAGES && (
              <button
                type='button'
                className='community-entry-form__image-add'
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (uploadStatus || intl.formatMessage(messages.uploading)) : intl.formatMessage(messages.addPhoto)}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            multiple
            style={{ display: 'none' }}
            onChange={handleImageFiles}
          />
          {uploadError && <p className='community-entry-form__error'>{uploadError}</p>}
        </div>
      )}

      {/* Grouped field sections */}
      {groupOrder.map(groupName => {
        const fields = groupedFields[groupName];
        if (!fields) return null;

        const label = groupLabels[groupName] || (groupName !== 'default' ? humanize(groupName) : null);
        const cols = groupColumns[groupName] || 1;

        return (
          <fieldset key={groupName} className='community-entry-form__group'>
            {label && (
              <legend className='community-entry-form__group-title'>{label}</legend>
            )}

            <div className={`community-entry-form__row community-entry-form__row--cols-${cols}`}>
              {fields.map(field => (
                <FormField
                  key={field.db_name}
                  field={field}
                  value={formData[field.db_name]}
                  error={errors[field.db_name]}
                  onChange={handleChange}
                  intl={intl}
                />
              ))}
            </div>
          </fieldset>
        );
      })}

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className='community-entry-form__duplicate-warning'>
          <p className='community-entry-form__duplicate-warning-text'>
            {intl.formatMessage(messages.duplicateWarning)}
          </p>
          <ul className='community-entry-form__duplicate-list'>
            {duplicateWarning.map(match => (
              <li key={match.id} className='community-entry-form__duplicate-item'>
                <span className='community-entry-form__duplicate-name'>{match.preview}</span>
                <span className={`cd-status-badge cd-status-badge--${match.status}`}>{match.status}</span>
                <Link
                  to={`/${featureKey}/${match.id}`}
                  className='community-entry-form__duplicate-link'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {intl.formatMessage(messages.viewEntry)}
                </Link>
              </li>
            ))}
          </ul>
          <div className='community-entry-form__duplicate-actions'>
            <button
              type='button'
              className='button button-secondary'
              onClick={() => setDuplicateWarning(null)}
            >
              {intl.formatMessage(messages.editMyEntry)}
            </button>
            <button
              type='button'
              className='button'
              onClick={handleSubmitAnyway}
            >
              {intl.formatMessage(messages.submitAnyway)}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className='community-entry-form__actions'>
        <button
          type='button'
          onClick={handleSubmit}
          className='button'
          disabled={submitting || success}
        >
          {submitting
            ? intl.formatMessage(messages.submitting)
            : intl.formatMessage(mode === 'create' ? messages.submitCreate : messages.submitEdit)}
        </button>

        <Link to={cancelPath} className='button button-secondary'>
          {intl.formatMessage(messages.cancel)}
        </Link>
      </div>
    </div>
  );
};

// ── Individual Field Renderer ─────────────────────────────────

const FormField = ({ field, value, error, onChange, intl }) => {
  const id = `cf-${field.db_name}`;
  const errorId = error ? `${id}-err` : undefined;
  const locale = intl.locale;
  const label = fieldLabel(field, locale) || humanize(field.db_name);
  const ph    = fieldPlaceholder(field, locale);

  const colClass = field.column === '1' ? 'community-entry-form__field--col1'
    : field.column === '2' ? 'community-entry-form__field--col2'
    : 'community-entry-form__field--full';

  const handleInput = useCallback((e) => onChange(field.db_name, e.target.value), [onChange, field.db_name]);

  const inputClass = `community-entry-form__input ${error ? 'community-entry-form__input--error' : ''}`;

  let input;

  switch (field.widget) {
  case 'images':
    return null; // rendered centrally in EntryForm above the field groups

  case 'textarea':
    input = (
      <textarea id={id} value={value || ''} onChange={handleInput}
        className={inputClass} rows={4} required={field.required} placeholder={ph}
        aria-invalid={!!error} aria-describedby={errorId} />
    );
    break;

  case 'select':
    input = (
      <select id={id} value={value || ''} onChange={handleInput}
        className={inputClass} required={field.required}
        aria-invalid={!!error} aria-describedby={errorId}>
        <option value=''>{intl.formatMessage({ id: 'community.form.select', defaultMessage: 'Select…' })}</option>
        {(field.options || []).map(opt => <option key={opt} value={opt}>{optionLabel(field, opt, locale)}</option>)}
      </select>
    );
    break;

  case 'location_select':
    input = (
      <LocationSelectField field={field} value={value} onChange={onChange} error={error} errorId={errorId} intl={intl} />
    );
    return (
      <div className={`community-entry-form__field ${colClass}`}>
        <label htmlFor={id} className='community-entry-form__label'>
          {label}{field.required && <span className='community-entry-form__required'> *</span>}
        </label>
        {input}
        {error && <p id={errorId} className='community-entry-form__error'>{error}</p>}
      </div>
    );

  case 'checkboxes':
    input = (
      <CheckboxField field={field} value={value} onChange={onChange} error={error} errorId={errorId} intl={intl} />
    );
    return (
      <div className={`community-entry-form__field ${colClass}`}>
        {input}
      </div>
    );

  case 'radio':
    input = (
      <RadioField field={field} value={value} onChange={onChange} error={error} errorId={errorId} intl={intl} />
    );
    return (
      <div className={`community-entry-form__field ${colClass}`}>
        {input}
      </div>
    );

  case 'date':
    input = <input id={id} type='date' value={value || ''} onChange={handleInput} className={inputClass}
      required={field.required} placeholder={ph} aria-invalid={!!error} aria-describedby={errorId} />;
    break;

  case 'url':
    input = <input id={id} type='url' value={value || ''} onChange={handleInput} className={inputClass}
      required={field.required} placeholder={ph || 'https://'} aria-invalid={!!error} aria-describedby={errorId} />;
    break;

  case 'email':
    input = <input id={id} type='email' value={value || ''} onChange={handleInput} className={inputClass}
      required={field.required} placeholder={ph} aria-invalid={!!error} aria-describedby={errorId} />;
    break;

  case 'number':
    input = <input id={id} type='number' value={value ?? ''} onChange={handleInput} className={inputClass}
      required={field.required} placeholder={ph} aria-invalid={!!error} aria-describedby={errorId} />;
    break;

  default: // text
    input = <input id={id} type='text' value={value || ''} onChange={handleInput} className={inputClass}
      required={field.required} placeholder={ph} aria-invalid={!!error} aria-describedby={errorId} />;
  }

  return (
    <div className={`community-entry-form__field ${colClass}`}>
      <label htmlFor={id} className='community-entry-form__label'>
        {label}
        {field.required && <span className='community-entry-form__required'> *</span>}
      </label>
      {input}
      {error && <p id={errorId} className='community-entry-form__error'>{error}</p>}
    </div>
  );
};

// ── Location select sub-component ────────────────────────────

const LocationSelectField = ({ field, value, onChange, error, errorId, intl }) => {
  const id = `cf-${field.db_name}`;
  const [options, setOptions] = useState([]);

  useEffect(() => {
    getLocations().then(locs => setOptions(locs));
  }, []);

  const handleChange = useCallback((e) => onChange(field.db_name, e.target.value), [onChange, field.db_name]);
  const inputClass = `community-entry-form__input ${error ? 'community-entry-form__input--error' : ''}`;

  return (
    <select
      id={id}
      value={value || ''}
      onChange={handleChange}
      className={inputClass}
      required={field.required}
      aria-invalid={!!error}
      aria-describedby={errorId}
    >
      <option value=''>{intl.formatMessage({ id: 'community.form.select', defaultMessage: 'Select…' })}</option>
      {options.map(loc => (
        <option key={loc.id} value={loc.name}>{loc.name}</option>
      ))}
    </select>
  );
};

// ── Checkbox / Radio sub-components ───────────────────────────

const CheckboxField = ({ field, value, onChange, error, errorId, intl }) => {
  const arr = Array.isArray(value) ? value : [];
  const locale = intl.locale;
  const label = fieldLabel(field, locale) || humanize(field.db_name);

  const toggle = useCallback((opt) => {
    const next = arr.includes(opt)
      ? arr.filter(v => v !== opt)
      : [...arr, opt];
    onChange(field.db_name, next);
  }, [arr, onChange, field.db_name]);

  return (
    <fieldset aria-invalid={!!error} aria-describedby={errorId}>
      <legend className='community-entry-form__label'>
        {label}{field.required && <span className='community-entry-form__required'> *</span>}
      </legend>
      <div className='community-entry-form__option-group'>
        {(field.options || []).map(opt => (
          <label key={opt} className='community-entry-form__option'>
            <input type='checkbox' checked={arr.includes(opt)} onChange={() => toggle(opt)} />
            <span>{optionLabel(field, opt, locale)}</span>
          </label>
        ))}
      </div>
      {error && <p id={errorId} className='community-entry-form__error'>{error}</p>}
    </fieldset>
  );
};

const RadioField = ({ field, value, onChange, error, errorId, intl }) => {
  const locale = intl.locale;
  const label = fieldLabel(field, locale) || humanize(field.db_name);

  const select = useCallback((e) => onChange(field.db_name, e.target.value), [onChange, field.db_name]);

  return (
    <fieldset aria-invalid={!!error} aria-describedby={errorId}>
      <legend className='community-entry-form__label'>
        {label}{field.required && <span className='community-entry-form__required'> *</span>}
      </legend>
      <div className='community-entry-form__option-group'>
        {(field.options || []).map(opt => (
          <label key={opt} className='community-entry-form__option'>
            <input type='radio' name={field.db_name} value={opt} checked={value === opt} onChange={select} />
            <span>{optionLabel(field, opt, locale)}</span>
          </label>
        ))}
      </div>
      {error && <p id={errorId} className='community-entry-form__error'>{error}</p>}
    </fieldset>
  );
};
