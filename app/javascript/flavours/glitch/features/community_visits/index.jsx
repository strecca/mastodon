// features/community_visits/index.jsx
// "When I'll Be In Town" — calendar view for community member visit planning.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from '@unhead/react/helmet';
import { Column }       from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';
import { useIdentity }  from 'flavours/glitch/identity_context';
import {
  fetchVisits, fetchMyVisits, fetchHeatmap, deleteVisit,
} from 'flavours/glitch/actions/community_visits';
import { VisitForm }        from './components/visit_form';
import { NotifyFriendsModal } from './components/notify_friends_modal';
import { DayDetailPanel }  from './components/day_detail_panel';
import AddIcon          from '@/material-icons/400-24px/add.svg?react';
import EditIcon         from '@/material-icons/400-24px/edit.svg?react';
import DeleteIcon       from '@/material-icons/400-24px/delete.svg?react';
import ChevronLeftIcon  from '@/material-icons/400-24px/chevron_left.svg?react';
import ChevronRightIcon from '@/material-icons/400-24px/chevron_right.svg?react';
import ShareIcon        from '@/material-icons/400-24px/share.svg?react';
import CelebrationIcon  from '@/material-icons/400-24px/celebration.svg?react';
import TripIcon         from '@/material-icons/400-24px/trip.svg?react';

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FILTER_CHIPS = [
  { key: 'now',       label: 'In Town Now' },
  { key: 'today',     label: 'Today' },
  { key: 'tomorrow',  label: 'Tomorrow' },
  { key: 'this_week', label: 'This Week' },
  { key: 'next_week', label: 'Next Week' },
];

const getFilterRange = (key) => {
  const t = new Date();
  switch (key) {
    case 'now':
    case 'today': {
      const s = isoDate(t);
      return { from: s, to: s, navDate: { year: t.getFullYear(), month: t.getMonth() } };
    }
    case 'tomorrow': {
      const tom = new Date(t); tom.setDate(t.getDate() + 1);
      const s = isoDate(tom);
      return { from: s, to: s, navDate: { year: tom.getFullYear(), month: tom.getMonth() } };
    }
    case 'this_week': {
      const ws = new Date(t); ws.setDate(t.getDate() - t.getDay());
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return { from: isoDate(ws), to: isoDate(we), navDate: { year: t.getFullYear(), month: t.getMonth() } };
    }
    case 'next_week': {
      const ws = new Date(t); ws.setDate(t.getDate() - t.getDay() + 7);
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return { from: isoDate(ws), to: isoDate(we), navDate: { year: ws.getFullYear(), month: ws.getMonth() } };
    }
    default: return null;
  }
};

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

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Date helpers ──────────────────────────────────────────────────────────────

const isoDate = (d) => d.toISOString().slice(0, 10);
const todayIso = isoDate(new Date());

// Build the 7-column grid for a month (null = padding day from adjacent month)
const buildGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days  = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

// Expand each visit into a set of ISO date keys it covers
const buildVisitsByDay = (visits) => {
  const map = {};
  visits.forEach(visit => {
    const arrival   = visit.get('arrival_date');
    const departure = visit.get('departure_date');
    const cursor    = new Date(arrival + 'T00:00:00');
    const end       = new Date(departure + 'T00:00:00');
    while (cursor <= end) {
      const key = isoDate(cursor);
      if (!map[key]) map[key] = [];
      map[key].push(visit);
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return map;
};

const fmtDateRange = (a, b) => {
  const opts = { month: 'short', day: 'numeric' };
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return `${da.toLocaleDateString(undefined, opts)} – ${db.toLocaleDateString(undefined, opts)}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

// Public heatmap teaser shown to non-members
const HeatmapTeaser = ({ heatmap }) => {
  const months = useMemo(() => {
    const now   = new Date();
    const items = [];
    for (let i = -2; i <= 11; i++) {
      const d   = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = isoDate(d).slice(0, 7);
      items.push({ key, label: MONTH_NAMES[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(), count: heatmap.get(key) || 0 });
    }
    return items;
  }, [heatmap]);

  const max = Math.max(...months.map(m => m.count), 1);

  return (
    <div className='cv-teaser'>
      <div className='cv-teaser__hero'>
        <TripIcon />
        <h2>When I'll Be In Town</h2>
        <p>Members share their visit dates so connections can meet up. Sign in to see who's coming and add your own dates.</p>
      </div>
      <div className='cv-teaser__heatmap'>
        {months.map(m => (
          <div key={m.key} className='cv-teaser__month'>
            <div
              className='cv-teaser__bar'
              style={{ '--intensity': m.count / max }}
              title={`${m.count} visit${m.count === 1 ? '' : 's'} planned`}
            />
            <span className='cv-teaser__month-label'>{m.label}</span>
            {m.count > 0 && <span className='cv-teaser__count'>{m.count}</span>}
          </div>
        ))}
      </div>
      <p className='cv-teaser__cta'>Join to see who's visiting and let them know you're coming.</p>
    </div>
  );
};

// Avatar pile for a calendar day cell — up to 5 avatars + overflow count
const AvatarPile = ({ visits }) => {
  const visible  = visits.slice(0, 5);
  const overflow = visits.length - 5;
  return (
    <div className='cv-day__avatars'>
      {visible.map(v => {
        const rel  = v.get('relationship') || 'none';
        const acct = v.get('account');
        return (
          <span
            key={v.get('id')}
            className='cv-day__avatar-wrap'
            style={{ '--ring': v.get('is_own') ? 'var(--color-border-brand)' : (RING_COLORS[rel] ?? RING_COLORS.none) }}
            title={acct?.get('display_name') || acct?.get('username')}
          >
            <img
              className='cv-day__avatar'
              src={acct?.get('avatar')}
              alt={acct?.get('username')}
            />
          </span>
        );
      })}
      {overflow > 0 && <span className='cv-day__overflow'>+{overflow}</span>}
    </div>
  );
};

// One visit card in the "My Visits" strip
const MyVisitCard = ({ visit, onEdit, onDelete, onNotify }) => {
  const arrival   = visit.get('arrival_date');
  const departure = visit.get('departure_date');
  const isPast    = departure < todayIso;
  const avail     = visit.get('availabilities')?.toJS() ?? [];

  return (
    <div className={`cv-my-card${isPast ? ' cv-my-card--past' : ''}`}>
      <div className='cv-my-card__dates'>{fmtDateRange(arrival, departure)}</div>
      {avail.length > 0 && (
        <div className='cv-my-card__chips'>
          {avail.map(k => (
            <span key={k} className='cv-my-card__chip'>{AVAILABILITY_LABELS[k] || k}</span>
          ))}
        </div>
      )}
      {visit.get('note') && (
        <p className='cv-my-card__note'>{visit.get('note')}</p>
      )}
      <div className='cv-my-card__actions'>
        {!isPast && (
          <>
            <button className='cv-icon-btn' title='Notify connections' onClick={() => onNotify(visit)}>
              <ShareIcon />
            </button>
            <button className='cv-icon-btn' title='Edit' onClick={() => onEdit(visit)}>
              <EditIcon />
            </button>
          </>
        )}
        <button className='cv-icon-btn cv-icon-btn--danger' title='Delete' onClick={() => onDelete(visit)}>
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const CommunityVisits = ({ multiColumn }) => {
  const dispatch   = useAppDispatch();
  const { signedIn } = useIdentity();

  const visits        = useAppSelector(s => s.getIn(['community_visits', 'visits']));
  const myVisits      = useAppSelector(s => s.getIn(['community_visits', 'myVisits']));
  const heatmap       = useAppSelector(s => s.getIn(['community_visits', 'heatmap']));
  const loading       = useAppSelector(s => s.getIn(['community_visits', 'loading']));

  // Calendar navigation state
  const [navDate, setNavDate] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const { year, month } = navDate;

  // Search + filter state
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeFilter, setActiveFilter] = useState(null);

  // Modal state
  const [showForm,     setShowForm]     = useState(false);
  const [editingVisit, setEditingVisit] = useState(null); // ImmutableMap or null
  const [notifyVisit,  setNotifyVisit]  = useState(null); // ImmutableMap or null
  const [dayPanel,     setDayPanel]     = useState(null); // { date, visits } or null

  // Load calendar data for the visible month
  useEffect(() => {
    if (!signedIn) { dispatch(fetchHeatmap()); return; }
    const from = isoDate(new Date(year, month, 1));
    const to   = isoDate(new Date(year, month + 1, 0));
    dispatch(fetchVisits(from, to));
  }, [dispatch, signedIn, year, month]);

  // Load own visits once on sign-in (covers full 18-month view)
  useEffect(() => {
    if (!signedIn) return;
    dispatch(fetchMyVisits());
    dispatch(fetchHeatmap());
  }, [dispatch, signedIn]);

  // Navigate calendar when filter is selected
  useEffect(() => {
    if (!activeFilter) return;
    const range = getFilterRange(activeFilter);
    if (range?.navDate) setNavDate(range.navDate);
  }, [activeFilter]);

  // Filter visits by search query and active chip filter
  const filteredVisits = useMemo(() => {
    let result = visits;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(v => {
        const acct = v.get('account');
        return acct?.get('display_name')?.toLowerCase().includes(q) ||
               acct?.get('username')?.toLowerCase().includes(q);
      });
    }
    if (activeFilter) {
      const range = getFilterRange(activeFilter);
      if (range) {
        result = result.filter(v =>
          v.get('arrival_date') <= range.to && v.get('departure_date') >= range.from
        );
      }
    }
    return result;
  }, [visits, searchQuery, activeFilter]);

  // Calendar grid
  const calendarGrid = useMemo(() => buildGrid(year, month), [year, month]);
  const visitsByDay  = useMemo(() => buildVisitsByDay(filteredVisits), [filteredVisits]);

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

  const openCreate  = () => { setEditingVisit(null); setShowForm(true); };
  const openEdit    = (v) => { setEditingVisit(v);   setShowForm(true); };
  const closeForm   = () => { setShowForm(false); setEditingVisit(null); };
  const openDayPanel = useCallback((key, dayVisits) => {
    if (dayVisits.length > 0) setDayPanel({ date: key, visits: dayVisits });
  }, []);

  const handleDelete = useCallback(async (visit) => {
    if (!window.confirm('Remove this visit from the calendar?')) return;
    await dispatch(deleteVisit(visit.get('id')));
  }, [dispatch]);

  // My visits sorted by arrival, newest-future first then past
  const sortedMyVisits = useMemo(() =>
    myVisits.sortBy(v => v.get('arrival_date')).reverse(),
  [myVisits]);

  const isToday   = (d) => d && isoDate(d) === todayIso;
  const isPastDay = (d) => d && isoDate(d) < todayIso;

  return (
    <Column bindToDocument={!multiColumn} label="When I'll Be In Town">
      <ColumnHeader
        title="When I'll Be In Town"
        icon='trip'
        multiColumn={multiColumn}
        showBackButton
      >
        {signedIn && (
          <button className='button button--compact' onClick={openCreate}>
            <AddIcon /> Add my dates
          </button>
        )}
      </ColumnHeader>

      <div className='cv-page'>
        {!signedIn ? (
          <HeatmapTeaser heatmap={heatmap} />
        ) : (
          <>
            {/* ── Hero banner ───────────────────────────────────────── */}
            <div className='cv-hero'>
              <TripIcon className='cv-hero__icon' />
              <h2 className='cv-hero__title'>When I'll Be In Town</h2>
              <p className='cv-hero__subtitle'>Share your dates · See who's arriving · Meet up</p>
            </div>

            {/* ── Search ────────────────────────────────────────────── */}
            <div className='cv-search'>
              <input
                type='search'
                className='cv-search__input'
                placeholder='Search members…'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* ── Filter chips ──────────────────────────────────────── */}
            <div className='cv-filters'>
              {FILTER_CHIPS.map(chip => (
                <button
                  key={chip.key}
                  type='button'
                  className={`cv-filter-chip${activeFilter === chip.key ? ' cv-filter-chip--active' : ''}`}
                  onClick={() => toggleFilter(chip.key)}
                >
                  {chip.label}
                </button>
              ))}
              {(activeFilter || searchQuery) && (
                <button type='button' className='cv-filter-chip cv-filter-chip--clear' onClick={clearFilters}>
                  Clear
                </button>
              )}
            </div>

            {/* ── Month navigation ──────────────────────────────────── */}
            <div className='cv-cal__nav'>
              <button className='cv-nav-btn' onClick={prevMonth} aria-label='Previous month'>
                <ChevronLeftIcon />
              </button>
              <h2 className='cv-cal__month-title'>
                {MONTH_NAMES[month]} {year}
              </h2>
              <button className='cv-nav-btn' onClick={nextMonth} aria-label='Next month'>
                <ChevronRightIcon />
              </button>
            </div>

            {/* ── Calendar grid ─────────────────────────────────────── */}
            <div className='cv-cal'>
              {WEEKDAY_LABELS.map(d => (
                <div key={d} className='cv-cal__weekday'>{d}</div>
              ))}

              {loading && visits.size === 0
                ? Array.from({ length: 35 }, (_, i) => (
                    <div key={i} className='cv-cal__day cv-cal__day--skeleton' />
                  ))
                : calendarGrid.map((day, i) => {
                    if (!day) return <div key={i} className='cv-cal__day cv-cal__day--empty' />;
                    const key       = isoDate(day);
                    const dayVisits = visitsByDay[key] || [];
                    const clickable = dayVisits.length > 0;
                    return (
                      <div
                        key={key}
                        className={[
                          'cv-cal__day',
                          isToday(day)   && 'cv-cal__day--today',
                          isPastDay(day) && 'cv-cal__day--past',
                          clickable      && 'cv-cal__day--has-visits',
                        ].filter(Boolean).join(' ')}
                        onClick={clickable ? () => openDayPanel(key, dayVisits) : undefined}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : undefined}
                        onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && openDayPanel(key, dayVisits) : undefined}
                        aria-label={clickable ? `${day.getDate()} — ${dayVisits.length} visitor${dayVisits.length === 1 ? '' : 's'}` : undefined}
                      >
                        <span className='cv-cal__day-num'>{day.getDate()}</span>
                        {dayVisits.length > 0 && (
                          <AvatarPile visits={dayVisits} />
                        )}
                      </div>
                    );
                  })
              }
            </div>

            {/* ── Relationship legend + notifications link ──────────── */}
            <div className='cv-legend'>
              {Object.entries({ mutual: 'Mutual', following: 'Following', follower: 'Follows you', none: 'Member' }).map(([k, label]) => (
                <span key={k} className='cv-legend__item'>
                  <span className='cv-legend__dot' style={{ background: RING_COLORS[k] }} />
                  {label}
                </span>
              ))}
              <Link to='/community_visits/notifications' className='cv-legend__notif-link'>
                Notifications &amp; Settings →
              </Link>
            </div>

            {/* ── My visits strip ───────────────────────────────────── */}
            <div className='cv-my-section'>
              <div className='cv-my-section__header'>
                <h3 className='cv-my-section__title'>My visits</h3>
                <button className='button button--compact' onClick={openCreate}>
                  <AddIcon /> Add
                </button>
              </div>

              {sortedMyVisits.size === 0 ? (
                <p className='cv-my-section__empty'>
                  You haven't added any visits yet. Let connections know when you'll be in town!
                </p>
              ) : (
                <div className='cv-my-section__list'>
                  {sortedMyVisits.map(v => (
                    <MyVisitCard
                      key={v.get('id')}
                      visit={v}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onNotify={setNotifyVisit}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Cross-link to events ──────────────────────────────── */}
            <Link to='/community_events' className='cv-crosslink cv-crosslink--events'>
              <CelebrationIcon className='cv-crosslink__icon' />
              <span className='cv-crosslink__text'>
                <strong>See what's happening</strong>
                <span>Concerts · Festivals · Workshops in the area</span>
              </span>
              <span className='cv-crosslink__arrow'>→</span>
            </Link>
          </>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showForm && (
        <VisitForm
          visit={editingVisit}
          onClose={closeForm}
          onSaved={closeForm}
        />
      )}
      {notifyVisit && (
        <NotifyFriendsModal
          visit={notifyVisit}
          onClose={() => setNotifyVisit(null)}
        />
      )}
      {dayPanel && (
        <DayDetailPanel
          date={dayPanel.date}
          visits={dayPanel.visits}
          onClose={() => setDayPanel(null)}
          onEdit={openEdit}
        />
      )}

      <Helmet>
        <title>When I'll Be In Town</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

export default CommunityVisits;
