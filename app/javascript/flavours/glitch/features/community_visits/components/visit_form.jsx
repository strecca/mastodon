// visit_form.jsx — create / edit modal for a community visit

import { useState, useEffect } from 'react';
import { useAppDispatch } from 'flavours/glitch/store';
import { createVisit, updateVisit } from 'flavours/glitch/actions/community_visits';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';

const AVAILABILITY_OPTIONS = [
  { value: 'coffee',       label: 'Coffee or a chat' },
  { value: 'dinner',       label: 'Dinner out' },
  { value: 'hike',         label: 'Hike or walk' },
  { value: 'excursion',    label: 'Day excursion' },
  { value: 'introduction', label: 'Open to introductions' },
  { value: 'open_house',   label: 'Open house / drop by' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public_to_members', label: 'All members',    desc: 'Everyone who has joined can see you\'re in town' },
  { value: 'connections_only',  label: 'My connections', desc: 'Only people you follow or who follow you' },
  { value: 'ghost',             label: 'Private',        desc: 'Only you can see this — useful for planning your own dates' },
];

const today = () => new Date().toISOString().slice(0, 10);

export const VisitForm = ({ visit, onClose, onSaved }) => {
  const dispatch = useAppDispatch();

  const [arrivalDate,   setArrivalDate]   = useState(visit ? visit.get('arrival_date')   : today());
  const [departureDate, setDepartureDate] = useState(visit ? visit.get('departure_date') : today());
  const [visibility,    setVisibility]    = useState(visit ? visit.get('visibility')     : 'public_to_members');
  const [availabilities, setAvailabilities] = useState(
    visit ? (visit.get('availabilities')?.toJS() ?? []) : []
  );
  const [note,    setNote]    = useState(visit ? (visit.get('note') ?? '') : '');
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState([]);

  // Keep departure ≥ arrival whenever arrival changes
  useEffect(() => {
    if (departureDate < arrivalDate) setDepartureDate(arrivalDate);
  }, [arrivalDate, departureDate]);

  const toggleAvailability = (value) => {
    setAvailabilities(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSaving(true);

    const visitData    = { arrival_date: arrivalDate, departure_date: departureDate, visibility, note: note || null };
    const avail        = availabilities;

    try {
      const saved = visit
        ? await dispatch(updateVisit(visit.get('id'), visitData, avail))
        : await dispatch(createVisit(visitData, avail));
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setErrors(err?.response?.data?.errors ?? ['Something went wrong. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='cv-modal-backdrop' onClick={onClose}>
      <div className='cv-modal' onClick={e => e.stopPropagation()} role='dialog' aria-modal='true'>
        <div className='cv-modal__header'>
          <h2 className='cv-modal__title'>
            {visit ? 'Edit your visit' : 'Add a visit'}
          </h2>
          <button className='cv-modal__close' onClick={onClose} aria-label='Close'>
            <CloseIcon />
          </button>
        </div>

        <form className='cv-modal__body' onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <ul className='cv-form__errors'>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}

          {/* Date range */}
          <div className='cv-form__date-row'>
            <div className='cv-form__field'>
              <label className='cv-form__label' htmlFor='cv-arrival'>Arriving</label>
              <input
                id='cv-arrival'
                type='date'
                className='cv-form__input'
                value={arrivalDate}
                min={visit ? undefined : today()}
                onChange={e => setArrivalDate(e.target.value)}
                required
              />
            </div>
            <div className='cv-form__field'>
              <label className='cv-form__label' htmlFor='cv-departure'>Leaving</label>
              <input
                id='cv-departure'
                type='date'
                className='cv-form__input'
                value={departureDate}
                min={arrivalDate}
                onChange={e => setDepartureDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Visibility */}
          <fieldset className='cv-form__fieldset'>
            <legend className='cv-form__legend'>Who can see this visit?</legend>
            <div className='cv-form__radio-group'>
              {VISIBILITY_OPTIONS.map(opt => (
                <label key={opt.value} className={`cv-form__radio-card${visibility === opt.value ? ' cv-form__radio-card--active' : ''}`}>
                  <input
                    type='radio'
                    name='visibility'
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                  />
                  <span className='cv-form__radio-label'>{opt.label}</span>
                  <span className='cv-form__radio-desc'>{opt.desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Availability checkboxes */}
          {(
            <fieldset className='cv-form__fieldset'>
              <legend className='cv-form__legend'>I'm open to…</legend>
              <div className='cv-form__check-grid'>
                {AVAILABILITY_OPTIONS.map(opt => (
                  <label key={opt.value} className={`cv-form__check-pill${availabilities.includes(opt.value) ? ' cv-form__check-pill--on' : ''}`}>
                    <input
                      type='checkbox'
                      checked={availabilities.includes(opt.value)}
                      onChange={() => toggleAvailability(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Optional note */}
          {(
            <div className='cv-form__field'>
              <label className='cv-form__label' htmlFor='cv-note'>Note <span className='cv-form__optional'>(optional)</span></label>
              <textarea
                id='cv-note'
                className='cv-form__input cv-form__textarea'
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder='e.g. "Arriving by train, free from the 5th onwards"'
                maxLength={280}
                rows={3}
              />
            </div>
          )}

          <div className='cv-form__actions'>
            <button type='button' className='button button-secondary' onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type='submit' className='button' disabled={saving}>
              {saving ? 'Saving…' : (visit ? 'Save changes' : 'Add to calendar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
