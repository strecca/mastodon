import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import EditIcon  from '@/material-icons/400-24px/edit.svg?react';

const RING_COLORS = {
  mutual:    '#f4a000',
  following: '#4caf50',
  follower:  '#2196f3',
  none:      '#bdbdbd',
};

const AVAILABILITY_LABELS = {
  coffee:       'Coffee',
  dinner:       'Dinner',
  hike:         'Hike',
  excursion:    'Excursion',
  introduction: 'Introductions',
  open_house:   'Open house',
};

const VISIBILITY_LABELS = {
  public_to_members: 'All members',
  connections_only:  'My connections',
  ghost:             'Private',
};

const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

const fmtDateRange = (a, b) => {
  const opts = { month: 'short', day: 'numeric' };
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  if (a === b) return da.toLocaleDateString(undefined, { ...opts, year: 'numeric' });
  return `${da.toLocaleDateString(undefined, opts)} – ${db.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`;
};

export const DayDetailPanel = ({ date, visits, onClose, onEdit }) => {
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!date || !visits) return null;

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className='cv-modal-backdrop' onClick={handleBackdropClick} role='dialog' aria-modal='true' aria-label={`Visitors on ${fmtDate(date)}`}>
      <div className='cv-modal cv-day-panel'>
        <div className='cv-day-panel__header'>
          <h2 className='cv-day-panel__title'>{fmtDate(date)}</h2>
          <button className='cv-icon-btn' onClick={onClose} aria-label='Close'>
            <CloseIcon />
          </button>
        </div>

        <div className='cv-day-panel__count'>
          {visits.length} {visits.length === 1 ? 'person' : 'people'} in town
        </div>

        <ul className='cv-day-panel__list'>
          {visits.map(visit => {
            const acct     = visit.get('account');
            const rel      = visit.get('relationship') || 'none';
            const isOwn    = visit.get('is_own');
            const avail    = visit.get('availabilities')?.toJS() ?? [];
            const note     = visit.get('note');
            const arrival  = visit.get('arrival_date');
            const depart   = visit.get('departure_date');
            const isPast   = depart < todayIso;
            const vis      = visit.get('visibility');
            const ringColor = isOwn ? 'var(--color-border-brand)' : (RING_COLORS[rel] ?? RING_COLORS.none);

            return (
              <li key={visit.get('id')} className={`cv-day-panel__visitor${isPast ? ' cv-day-panel__visitor--past' : ''}`}>
                <div className='cv-day-panel__visitor-avatar-wrap' style={{ '--ring': ringColor }}>
                  <img
                    className='cv-day-panel__visitor-avatar'
                    src={acct?.get('avatar')}
                    alt={acct?.get('username')}
                  />
                </div>

                <div className='cv-day-panel__visitor-info'>
                  <div className='cv-day-panel__visitor-name'>
                    <Link to={`/@${acct?.get('username')}`} className='cv-day-panel__profile-link'>
                      <strong>{acct?.get('display_name') || `@${acct?.get('username')}`}</strong>
                    </Link>
                    <span className='cv-day-panel__visitor-username'>@{acct?.get('username')}</span>
                    {isOwn && <span className='cv-day-panel__visitor-you'>you</span>}
                  </div>

                  <div className='cv-day-panel__visitor-dates'>{fmtDateRange(arrival, depart)}</div>

                  {avail.length > 0 && (
                    <div className='cv-day-panel__chips'>
                      {avail.map(k => (
                        <span key={k} className='cv-day-panel__chip'>{AVAILABILITY_LABELS[k] || k}</span>
                      ))}
                    </div>
                  )}

                  {note && <p className='cv-day-panel__note'>{note}</p>}

                  {isOwn && vis && (
                    <span className='cv-day-panel__visibility'>{VISIBILITY_LABELS[vis] || vis}</span>
                  )}
                </div>

                {isOwn && !isPast && (
                  <button
                    className='cv-icon-btn cv-day-panel__edit-btn'
                    title='Edit this visit'
                    onClick={() => { onClose(); onEdit(visit); }}
                  >
                    <EditIcon />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
