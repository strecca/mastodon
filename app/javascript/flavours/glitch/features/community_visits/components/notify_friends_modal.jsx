// notify_friends_modal.jsx — send a friend_ping to connected visitors

import { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';
import { notifyFriends } from 'flavours/glitch/actions/community_visits';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import ShareIcon from '@/material-icons/400-24px/share.svg?react';

const RING_COLORS = {
  mutual:    '#f4a000',
  following: '#4caf50',
  follower:  '#2196f3',
  none:      '#bdbdbd',
};

const fmtDate = iso => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const datesOverlap = (a1, a2, b1, b2) => a1 <= b2 && a2 >= b1;

export const NotifyFriendsModal = ({ visit, onClose }) => {
  const dispatch = useAppDispatch();

  const visits = useAppSelector(s => s.getIn(['community_visits', 'visits']));

  // People who have overlapping visits AND are a connection (not own visit)
  const candidates = useMemo(() => {
    const arrival   = visit.get('arrival_date');
    const departure = visit.get('departure_date');

    return visits.filter(v =>
      !v.get('is_own') &&
      v.get('relationship') !== 'none' &&
      datesOverlap(arrival, departure, v.get('arrival_date'), v.get('departure_date'))
    ).toJS();
  }, [visits, visit]);

  const [selected, setSelected] = useState(() =>
    Object.fromEntries(candidates.map(v => [v.account.id, true]))
  );
  const [message, setMessage] = useState('');
  const [sending,  setSending] = useState(false);
  const [sent,     setSent]    = useState(false);
  const [error,    setError]   = useState(null);

  const toggleAccount = (id) =>
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const selectedIds = candidates
    .filter(v => selected[v.account.id])
    .map(v => Number(v.account.id));

  const handleSend = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await dispatch(notifyFriends(visit.get('id'), selectedIds, message || undefined));
      setSent(true);
    } catch {
      setError('Could not send notifications. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className='cv-modal-backdrop' onClick={onClose}>
      <div className='cv-modal' onClick={e => e.stopPropagation()} role='dialog' aria-modal='true'>
        <div className='cv-modal__header'>
          <h2 className='cv-modal__title'>Notify your connections</h2>
          <button className='cv-modal__close' onClick={onClose} aria-label='Close'>
            <CloseIcon />
          </button>
        </div>

        <div className='cv-modal__body'>
          <p className='cv-notify__subtitle'>
            Let people know you'll be in town{' '}
            <strong>{fmtDate(visit.get('arrival_date'))}–{fmtDate(visit.get('departure_date'))}</strong>.
          </p>

          {sent ? (
            <div className='cv-notify__success'>
              <ShareIcon />
              <span>Notifications sent!</span>
              <button className='button button-secondary' onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              {candidates.length === 0 ? (
                <p className='cv-notify__empty'>
                  No connections have announced overlapping visits yet.
                  They'll get an automatic notification when they do.
                </p>
              ) : (
                <ul className='cv-notify__list'>
                  {candidates.map(v => {
                    const acct = v.account;
                    const rel  = v.relationship;
                    return (
                      <li key={acct.id} className='cv-notify__item'>
                        <label className='cv-notify__label'>
                          <input
                            type='checkbox'
                            checked={!!selected[acct.id]}
                            onChange={() => toggleAccount(acct.id)}
                          />
                          <span
                            className='cv-notify__avatar-wrap'
                            style={{ '--ring': RING_COLORS[rel] ?? RING_COLORS.none }}
                          >
                            <img
                              className='cv-notify__avatar'
                              src={acct.avatar}
                              alt={acct.display_name || acct.username}
                            />
                          </span>
                          <span className='cv-notify__name'>
                            <strong>{acct.display_name || acct.username}</strong>
                            <span>@{acct.username}</span>
                          </span>
                          <span className='cv-notify__dates'>
                            {fmtDate(v.arrival_date)}–{fmtDate(v.departure_date)}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className='cv-form__field'>
                <label className='cv-form__label' htmlFor='cv-notify-msg'>
                  Personal message <span className='cv-form__optional'>(optional)</span>
                </label>
                <textarea
                  id='cv-notify-msg'
                  className='cv-form__input cv-form__textarea'
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder='e.g. "Let's grab a coffee while we're both in town!"'
                  maxLength={140}
                  rows={2}
                />
              </div>

              {error && <p className='cv-notify__error'>{error}</p>}

              <div className='cv-form__actions'>
                <button className='button button-secondary' onClick={onClose} disabled={sending}>
                  Cancel
                </button>
                <button
                  className='button'
                  onClick={handleSend}
                  disabled={sending || selectedIds.length === 0}
                >
                  {sending ? 'Sending…' : `Notify ${selectedIds.length} connection${selectedIds.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
