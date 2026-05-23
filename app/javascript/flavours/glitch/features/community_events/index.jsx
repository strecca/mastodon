// features/community_events/index.jsx
// Community Events calendar — monthly grid with event dots, day-click panel,
// filter chips, search, and "My Events" strip. Uses ce-* CSS namespace.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from '@unhead/react/helmet';
import { Column }       from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { useIdentity }  from 'flavours/glitch/identity_context';
import api              from 'flavours/glitch/api';
import AddIcon          from '@/material-icons/400-24px/add.svg?react';
import ChevronLeftIcon  from '@/material-icons/400-24px/chevron_left.svg?react';
import ChevronRightIcon from '@/material-icons/400-24px/chevron_right.svg?react';
import CelebrationIcon  from '@/material-icons/400-24px/celebration.svg?react';
import CloseIcon        from '@/material-icons/400-24px/close.svg?react';
import EditIcon         from '@/material-icons/400-24px/edit.svg?react';

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const FILTER_CHIPS = [
  { key: 'upcoming',   label: 'Upcoming' },
  { key: 'this_week',  label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'next_month', label: 'Next Month' },
  { key: 'past',       label: 'Past' },
];

// ── Date helpers ──────────────────────────────────────────────────────────────

const isoDate  = (d) => d.toISOString().slice(0, 10);
const todayIso = isoDate(new Date());

const getFilterRange = (key) => {
  const t = new Date();
  switch (key) {
    case 'upcoming':
      return { from: todayIso, to: null };
    case 'this_week': {
      const ws = new Date(t); ws.setDate(t.getDate() - t.getDay());
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return { from: isoDate(ws), to: isoDate(we), navDate: { year: t.getFullYear(), month: t.getMonth() } };
    }
    case 'this_month':
      return {
        from:    isoDate(new Date(t.getFullYear(), t.getMonth(), 1)),
        to:      isoDate(new Date(t.getFullYear(), t.getMonth() + 1, 0)),
        navDate: { year: t.getFullYear(), month: t.getMonth() },
      };
    case 'next_month': {
      const nm = new Date(t.getFullYear(), t.getMonth() + 1, 1);
      return {
        from:    isoDate(nm),
        to:      isoDate(new Date(nm.getFullYear(), nm.getMonth() + 1, 0)),
        navDate: { year: nm.getFullYear(), month: nm.getMonth() },
      };
    }
    case 'past': {
      const yesterday = new Date(t); yesterday.setDate(t.getDate() - 1);
      return { from: null, to: isoDate(yesterday) };
    }
    default: return null;
  }
};

const buildGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days  = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

const buildEventsByDay = (events) => {
  const map = {};
  events.forEach(evt => {
    const key = evt.event_date?.slice(0, 10);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(evt);
  });
  return map;
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

// ── EventDots — small dots inside a calendar day cell ─────────────────────────

const EventDots = ({ events }) => {
  const visible  = events.slice(0, 3);
  const overflow = events.length - 3;
  return (
    <div className='ce-day__events'>
      {visible.map(evt => (
        <span key={evt.id} className='ce-day__dot' title={evt.event_name} />
      ))}
      {overflow > 0 && <span className='ce-day__overflow'>+{overflow}</span>}
    </div>
  );
};

// ── EventDayPanel — modal listing all events for a clicked day ────────────────

const EventDayPanel = ({ date, events, onClose, accountId }) => {
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!date || !events) return null;

  return (
    <div className='cv-modal-backdrop' onClick={handleBackdropClick} role='dialog' aria-modal='true' aria-label={`Events on ${fmtDate(date)}`}>
      <div className='cv-modal ce-day-panel'>
        <div className='cv-day-panel__header'>
          <h2 className='cv-day-panel__title'>{fmtDate(date)}</h2>
          <button className='cv-icon-btn' onClick={onClose} aria-label='Close'>
            <CloseIcon />
          </button>
        </div>

        <div className='cv-day-panel__count'>
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </div>

        <ul className='cv-day-panel__list'>
          {events.map(evt => {
            const isOwn = String(evt.account_id) === String(accountId);
            return (
              <li key={evt.id} className='ce-day-panel__event'>
                <div className='ce-day-panel__event-header'>
                  <Link to={`/community_events/${evt.id}`} className='ce-day-panel__event-link'>
                    <strong>{evt.event_name}</strong>
                  </Link>
                  {isOwn && (
                    <Link to={`/community_events/${evt.id}/edit`} className='cv-icon-btn' title='Edit this event'>
                      <EditIcon />
                    </Link>
                  )}
                </div>

                {evt.location_town_city && (
                  <div className='ce-day-panel__location'>{evt.location_town_city}</div>
                )}

                {evt.category?.length > 0 && (
                  <div className='cv-day-panel__chips'>
                    {evt.category.map(c => (
                      <span key={c} className='cv-day-panel__chip ce-day-panel__chip'>{c}</span>
                    ))}
                  </div>
                )}

                {evt.account && (
                  <div className='ce-day-panel__organizer'>
                    <img
                      className='ce-day-panel__avatar'
                      src={evt.account.avatar}
                      alt={evt.account.username}
                    />
                    <span className='ce-day-panel__organizer-name'>
                      {evt.account.display_name || `@${evt.account.username}`}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

// ── MyEventCard — card in the "My Events" strip ───────────────────────────────

const MyEventCard = ({ event }) => {
  const isPast = (event.event_date?.slice(0, 10) ?? '') < todayIso;
  return (
    <div className={`ce-my-card${isPast ? ' ce-my-card--past' : ''}`}>
      <div className='ce-my-card__date'>{fmtDate(event.event_date)}</div>
      <div className='ce-my-card__name'>
        <Link to={`/community_events/${event.id}`}>{event.event_name}</Link>
      </div>
      {event.location_town_city && (
        <div className='ce-my-card__location'>{event.location_town_city}</div>
      )}
      {event.category?.length > 0 && (
        <div className='ce-my-card__chips'>
          {event.category.map(c => (
            <span key={c} className='ce-my-card__chip'>{c}</span>
          ))}
        </div>
      )}
      <div className='ce-my-card__actions'>
        <Link to={`/community_events/${event.id}/edit`} className='cv-icon-btn' title='Edit'>
          <EditIcon />
        </Link>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const CommunityEvents = ({ multiColumn }) => {
  const { signedIn, accountId } = useIdentity();

  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [navDate,      setNavDate]      = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [dayPanel,     setDayPanel]     = useState(null);

  const { year, month } = navDate;

  // Load all approved events once (public endpoint, no auth needed)
  useEffect(() => {
    setLoading(true);
    api().get('/api/v1/community_events', { params: { per_page: 200 } })
      .then(res => { setEvents(res.data.entries || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-navigate calendar when a date-range filter is selected
  useEffect(() => {
    if (!activeFilter) return;
    const range = getFilterRange(activeFilter);
    if (range?.navDate) setNavDate(range.navDate);
  }, [activeFilter]);

  // Apply search and chip filter to event list
  const filteredEvents = useMemo(() => {
    let result = events;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(e =>
        e.event_name?.toLowerCase().includes(q) ||
        e.location_town_city?.toLowerCase().includes(q) ||
        e.category?.some(c => c.toLowerCase().includes(q))
      );
    }
    if (activeFilter) {
      const range = getFilterRange(activeFilter);
      if (range) {
        result = result.filter(e => {
          const d = e.event_date?.slice(0, 10) ?? '';
          if (range.from && range.to) return d >= range.from && d <= range.to;
          if (range.from)             return d >= range.from;
          if (range.to)               return d <= range.to;
          return true;
        });
      }
    }
    return result;
  }, [events, searchQuery, activeFilter]);

  const calendarGrid = useMemo(() => buildGrid(year, month), [year, month]);
  const eventsByDay  = useMemo(() => buildEventsByDay(filteredEvents), [filteredEvents]);

  const prevMonth = useCallback(() =>
    setNavDate(({ year: y, month: m }) =>
      m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
    ), []);

  const nextMonth = useCallback(() =>
    setNavDate(({ year: y, month: m }) =>
      m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
    ), []);

  const toggleFilter = useCallback((key) =>
    setActiveFilter(prev => prev === key ? null : key), []);
  const clearFilters = useCallback(() => { setActiveFilter(null); setSearchQuery(''); }, []);

  const openDayPanel = useCallback((key, dayEvents) => {
    if (dayEvents.length > 0) setDayPanel({ date: key, events: dayEvents });
  }, []);

  const isToday   = (d) => d && isoDate(d) === todayIso;
  const isPastDay = (d) => d && isoDate(d) < todayIso;

  const myEvents = useMemo(() =>
    events
      .filter(e => String(e.account_id) === String(accountId))
      .sort((a, b) => (a.event_date > b.event_date ? -1 : 1)),
  [events, accountId]);

  return (
    <Column bindToDocument={!multiColumn} label='Community Events'>
      <ColumnHeader
        title='Community Events'
        icon='celebration'
        multiColumn={multiColumn}
        showBackButton
      >
        {signedIn && (
          <Link to='/community_events/new' className='button button--compact'>
            <AddIcon /> Post an Event
          </Link>
        )}
      </ColumnHeader>

      <div className='ce-page'>

        {/* ── Hero banner ──────────────────────────────────────────── */}
        <div className='ce-hero'>
          <CelebrationIcon className='ce-hero__icon' />
          <h2 className='ce-hero__title'>Community Events</h2>
          <p className='ce-hero__subtitle'>Concerts · Festivals · Workshops · Gatherings</p>
        </div>

        {/* ── Search ───────────────────────────────────────────────── */}
        <div className='cv-search'>
          <input
            type='search'
            className='cv-search__input ce-search__input'
            placeholder='Search by title, category or location…'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ── Filter chips ─────────────────────────────────────────── */}
        <div className='cv-filters ce-filters'>
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.key}
              type='button'
              className={`cv-filter-chip ce-filter-chip${activeFilter === chip.key ? ' ce-filter-chip--active' : ''}`}
              onClick={() => toggleFilter(chip.key)}
            >
              {chip.label}
            </button>
          ))}
          {(activeFilter || searchQuery) && (
            <button type='button' className='cv-filter-chip ce-filter-chip ce-filter-chip--clear' onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

        {/* ── Month navigation ─────────────────────────────────────── */}
        <div className='ce-cal__nav'>
          <button className='ce-nav-btn' onClick={prevMonth} aria-label='Previous month'>
            <ChevronLeftIcon />
          </button>
          <h2 className='cv-cal__month-title'>{MONTH_NAMES[month]} {year}</h2>
          <button className='ce-nav-btn' onClick={nextMonth} aria-label='Next month'>
            <ChevronRightIcon />
          </button>
        </div>

        {/* ── Calendar grid ─────────────────────────────────────────── */}
        <div className='cv-cal ce-cal'>
          {WEEKDAY_LABELS.map(d => (
            <div key={d} className='cv-cal__weekday ce-cal__weekday'>{d}</div>
          ))}

          {loading && events.length === 0
            ? Array.from({ length: 35 }, (_, i) => (
                <div key={i} className='cv-cal__day cv-cal__day--skeleton' />
              ))
            : calendarGrid.map((day, i) => {
                if (!day) return <div key={i} className='cv-cal__day cv-cal__day--empty' />;
                const key       = isoDate(day);
                const dayEvents = eventsByDay[key] || [];
                const clickable = dayEvents.length > 0;
                return (
                  <div
                    key={key}
                    className={[
                      'cv-cal__day',
                      isToday(day)   && 'cv-cal__day--today',
                      isPastDay(day) && 'cv-cal__day--past',
                      clickable      && 'ce-cal__day--has-events',
                    ].filter(Boolean).join(' ')}
                    onClick={clickable ? () => openDayPanel(key, dayEvents) : undefined}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && openDayPanel(key, dayEvents) : undefined}
                    aria-label={clickable ? `${day.getDate()} — ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : undefined}
                  >
                    <span className='cv-cal__day-num'>{day.getDate()}</span>
                    {dayEvents.length > 0 && <EventDots events={dayEvents} />}
                  </div>
                );
              })
          }
        </div>

        {/* ── My Events strip ──────────────────────────────────────── */}
        {signedIn && (
          <div className='cv-my-section ce-my-section'>
            <div className='cv-my-section__header'>
              <h3 className='cv-my-section__title ce-my-section__title'>My Events</h3>
              <Link to='/community_events/new' className='button button--compact'>
                <AddIcon /> Add
              </Link>
            </div>

            {myEvents.length === 0 ? (
              <p className='cv-my-section__empty'>
                You haven't posted any events yet. Share what's happening in the community!
              </p>
            ) : (
              <div className='cv-my-section__list'>
                {myEvents.map(evt => (
                  <MyEventCard key={evt.id} event={evt} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Day panel modal ─────────────────────────────────────────── */}
      {dayPanel && (
        <EventDayPanel
          date={dayPanel.date}
          events={dayPanel.events}
          onClose={() => setDayPanel(null)}
          accountId={accountId}
        />
      )}

      <Helmet>
        <title>Community Events</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

export default CommunityEvents;
