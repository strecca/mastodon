// app/javascript/flavours/glitch/components/community_directory/entry_form.jsx
//
// Shared form component used by generated new/ and edit/ pages.
// Renders fields grouped and laid out in 1 or 2 columns based on config.
// mode='create' | 'edit'

import { useState, useEffect, useCallback, useMemo } from 'react';

import { useIntl, defineMessages } from 'react-intl';
import { useHistory, Link } from 'react-router-dom';

import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import {
  fetchEntry,
  createEntry,
  updateEntry,
  clearCurrentEntry,
} from 'flavours/glitch/actions/community_entries';

const messages = defineMessages({
  submitCreate: { id: 'community.form.submit_create', defaultMessage: 'Submit entry' },
  submitEdit: { id: 'community.form.submit_edit', defaultMessage: 'Save changes' },
  submitting: { id: 'community.form.submitting', defaultMessage: 'Saving…' },
  success: { id: 'community.form.success', defaultMessage: 'Saved successfully! Redirecting…' },
  required: { id: 'community.form.required', defaultMessage: 'This field is required' },
  cancel: { id: 'community.form.cancel', defaultMessage: 'Cancel' },
  selectPlaceholder: { id: 'community.form.select', defaultMessage: 'Select…' },
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
        const val = currentEntry.get(field.db_name);
        if (val != null) {
          data[field.db_name] = val && typeof val.toJS === 'function' ? val.toJS() : val;
        }
      });
      setFormData(data);
      setPopulated(true);
    }
  }, [mode, currentEntry, populated, config.fields]);

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

  const handleSubmit = useCallback(async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);

    try {
      if (mode === 'create') {
        await dispatch(createEntry(categoryKey, apiEndpoint, formData));
      } else {
        await dispatch(updateEntry(categoryKey, apiEndpoint, entryId, formData));
      }
      setSuccess(true);
      setTimeout(() => {
        if (mode === 'create') {
          history.push(`/${featureKey}`);
        } else {
          history.push(`/${featureKey}/${entryId}`);
        }
      }, 1000);
    } catch {
      setSubmitting(false);
    }
  }, [validate, submitting, mode, dispatch, categoryKey, apiEndpoint, formData, entryId, history, featureKey]);

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
  const label = field.label || humanize(field.db_name);

  const colClass = field.column === '1' ? 'community-entry-form__field--col1'
    : field.column === '2' ? 'community-entry-form__field--col2'
    : 'community-entry-form__field--full';

  const handleInput = useCallback((e) => onChange(field.db_name, e.target.value), [onChange, field.db_name]);

  const inputClass = `community-entry-form__input ${error ? 'community-entry-form__input--error' : ''}`;

  let input;

  switch (field.widget) {
  case 'textarea':
    input = (
      <textarea id={id} value={value || ''} onChange={handleInput}
        className={inputClass} rows={4} required={field.required}
        aria-invalid={!!error} aria-describedby={errorId} />
    );
    break;

  case 'select':
    input = (
      <select id={id} value={value || ''} onChange={handleInput}
        className={inputClass} required={field.required}
        aria-invalid={!!error} aria-describedby={errorId}>
        <option value=''>{intl.formatMessage({ id: 'community.form.select', defaultMessage: 'Select…' })}</option>
        {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
    break;

  case 'checkboxes':
    input = (
      <CheckboxField field={field} value={value} onChange={onChange} error={error} errorId={errorId} />
    );
    return (
      <div className={`community-entry-form__field ${colClass}`}>
        {input}
      </div>
    );

  case 'radio':
    input = (
      <RadioField field={field} value={value} onChange={onChange} error={error} errorId={errorId} />
    );
    return (
      <div className={`community-entry-form__field ${colClass}`}>
        {input}
      </div>
    );

  case 'date':
    input = <input id={id} type='date' value={value || ''} onChange={handleInput} className={inputClass}
      required={field.required} aria-invalid={!!error} aria-describedby={errorId} />;
    break;

  case 'url':
    input = <input id={id} type='url' value={value || ''} onChange={handleInput} className={inputClass}
      required={field.required} placeholder='https://' aria-invalid={!!error} aria-describedby={errorId} />;
    break;

  case 'email':
    input = <input id={id} type='email' value={value || ''} onChange={handleInput} className={inputClass}
      required={field.required} aria-invalid={!!error} aria-describedby={errorId} />;
    break;

  case 'number':
    input = <input id={id} type='number' value={value ?? ''} onChange={handleInput} className={inputClass}
      required={field.required} aria-invalid={!!error} aria-describedby={errorId} />;
    break;

  default: // text
    input = <input id={id} type='text' value={value || ''} onChange={handleInput} className={inputClass}
      required={field.required} aria-invalid={!!error} aria-describedby={errorId} />;
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

// ── Checkbox / Radio sub-components ───────────────────────────

const CheckboxField = ({ field, value, onChange, error, errorId }) => {
  const arr = Array.isArray(value) ? value : [];
  const label = field.label || humanize(field.db_name);

  const toggle = useCallback((opt) => {
    const next = arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt];
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
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {error && <p id={errorId} className='community-entry-form__error'>{error}</p>}
    </fieldset>
  );
};

const RadioField = ({ field, value, onChange, error, errorId }) => {
  const label = field.label || humanize(field.db_name);

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
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {error && <p id={errorId} className='community-entry-form__error'>{error}</p>}
    </fieldset>
  );
};
