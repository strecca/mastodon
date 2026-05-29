import { useState, useEffect, useCallback } from 'react';

import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import api from 'flavours/glitch/api';

const VISIBILITY_LABELS = {
  public_to_members: { label: 'All members', color: '#1565c0' },
  connections_only:  { label: 'Connections',  color: '#2e7d32' },
  ghost:             { label: 'Private',      color: '#555' },
};

const fmtDate = (iso) => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const StatCard = ({ label, value, sub }) => (
  <div className='cv-admin__stat-card'>
    <span className='cv-admin__stat-value'>{value}</span>
    <span className='cv-admin__stat-label'>{label}</span>
    {sub && <span className='cv-admin__stat-sub'>{sub}</span>}
  </div>
);

const VisibilityBadge = ({ visibility }) => {
  const { label, color } = VISIBILITY_LABELS[visibility] ?? { label: visibility, color: '#888' };
  return (
    <span className='cv-admin__vis-badge' style={{ '--badge-color': color }}>
      {label}
    </span>
  );
};

const AvailChips = ({ availabilities }) => {
  if (!availabilities?.length) return null;
  return (
    <span className='cv-admin__avail-chips'>
      {availabilities.map(a => (
        <span key={a} className='cv-admin__avail-chip'>{a}</span>
      ))}
    </span>
  );
};

const VisitRow = ({ visit, onDelete }) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const handleDelete = useCallback(async () => {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    try {
      await api().delete(`/api/v1/community_visits/${visit.id}`);
      onDelete(visit.id);
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }, [confirming, visit.id, onDelete]);

  const today = new Date().toISOString().slice(0, 10);
  const isActive = visit.arrival_date <= today && visit.departure_date >= today;

  return (
    <div className={`cv-admin__row${isActive ? ' cv-admin__row--active' : ''}`}>
      <div className='cv-admin__row-member'>
        <img src={visit.account.avatar} alt='' className='cv-admin__avatar' />
        <div className='cv-admin__row-names'>
          <Link to={`/@${visit.account.username}`} className='cv-admin__display-name'>
            {visit.account.display_name || visit.account.username}
          </Link>
          <span className='cv-admin__username'>@{visit.account.username}</span>
        </div>
      </div>

      <div className='cv-admin__row-dates'>
        <span className='cv-admin__date'>{fmtDate(visit.arrival_date)}</span>
        <span className='cv-admin__date-sep'>→</span>
        <span className='cv-admin__date'>{fmtDate(visit.departure_date)}</span>
        <span className='cv-admin__duration'>({visit.duration_days}d)</span>
      </div>

      <div className='cv-admin__row-meta'>
        <VisibilityBadge visibility={visit.visibility} />
        <AvailChips availabilities={visit.availabilities} />
      </div>

      {visit.note && (
        <div className='cv-admin__row-note' title={visit.note}>
          {visit.note.length > 80 ? visit.note.slice(0, 80) + '…' : visit.note}
        </div>
      )}

      <div className='cv-admin__row-actions'>
        <button
          className={`cv-admin__delete-btn${confirming ? ' cv-admin__delete-btn--confirm' : ''}`}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : confirming ? 'Confirm delete?' : 'Delete'}
        </button>
        {confirming && !deleting && (
          <button className='cv-admin__cancel-btn' onClick={() => setConfirming(false)}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default function CommunityVisitsAdmin ({ multiColumn }) {
  const [stats,   setStats]   = useState(null);
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [search,     setSearch]     = useState('');
  const [visFilter,  setVisFilter]  = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter,   setToFilter]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search)     params.member     = search;
      if (visFilter)  params.visibility = visFilter;
      if (fromFilter) params.from       = fromFilter;
      if (toFilter)   params.to         = toFilter;

      const [statsRes, visitsRes] = await Promise.all([
        api().get('/api/v1/community_visits/admin_stats'),
        api().get('/api/v1/community_visits/admin_all', { params }),
      ]);
      setStats(statsRes.data);
      setVisits(visitsRes.data);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search, visFilter, fromFilter, toFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback((id) => {
    setVisits(prev => prev.filter(v => v.id !== id));
  }, []);

  const handleApplyFilters = useCallback((e) => {
    e.preventDefault();
    load();
  }, [load]);

  return (
    <Column>
      <ColumnHeader icon='person-walking' title='Visits Admin' multiColumn={multiColumn} />
      <Helmet><title>Visits Admin · miacivezza</title></Helmet>

      <div className='cv-admin'>
        {stats && (
          <div className='cv-admin__stats'>
            <StatCard label='In Town Now'    value={stats.in_town_now}    sub='active today' />
            <StatCard label='Arriving Soon'  value={stats.upcoming_7days} sub='next 7 days' />
            <StatCard label='Total Visits'   value={stats.total_visits} />
            <StatCard label='Members'        value={stats.total_members}  sub='unique' />
          </div>
        )}

        <form className='cv-admin__filters' onSubmit={handleApplyFilters}>
          <input
            className='cv-admin__filter-input'
            type='text'
            placeholder='Search member…'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className='cv-admin__filter-select'
            value={visFilter}
            onChange={e => setVisFilter(e.target.value)}
          >
            <option value=''>All visibility</option>
            <option value='public_to_members'>All members</option>
            <option value='connections_only'>Connections</option>
            <option value='ghost'>Private</option>
          </select>
          <input
            className='cv-admin__filter-input cv-admin__filter-input--date'
            type='date'
            value={fromFilter}
            onChange={e => setFromFilter(e.target.value)}
            placeholder='From'
          />
          <input
            className='cv-admin__filter-input cv-admin__filter-input--date'
            type='date'
            value={toFilter}
            onChange={e => setToFilter(e.target.value)}
            placeholder='To'
          />
          <button type='submit' className='cv-admin__filter-apply'>Apply</button>
          <button
            type='button'
            className='cv-admin__filter-clear'
            onClick={() => { setSearch(''); setVisFilter(''); setFromFilter(''); setToFilter(''); }}
          >
            Clear
          </button>
        </form>

        {loading && <LoadingIndicator />}
        {error   && <div className='cv-admin__error'>{error}</div>}

        {!loading && !error && (
          <>
            <div className='cv-admin__count'>{visits.length} visit{visits.length !== 1 ? 's' : ''}</div>
            <div className='cv-admin__list'>
              {visits.length === 0 ? (
                <div className='cv-admin__empty'>No visits found.</div>
              ) : visits.map(v => (
                <VisitRow key={v.id} visit={v} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}
      </div>
    </Column>
  );
}
