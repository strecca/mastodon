import { useState, useEffect, useCallback } from 'react';

import { Helmet } from '@unhead/react/helmet';

import TuneIcon        from '@/material-icons/400-24px/tune.svg?react';
import HistoryIcon     from '@/material-icons/400-24px/history.svg?react';
import CelebrationIcon from '@/material-icons/400-24px/celebration.svg?react';
import DeleteIcon      from '@/material-icons/400-24px/delete.svg?react';
import PlayIcon        from '@/material-icons/400-24px/play_arrow.svg?react';
import DatabaseIcon    from '@/material-icons/400-24px/database.svg?react';
import TagIcon         from '@/material-icons/400-24px/tag.svg?react';
import TripIcon        from '@/material-icons/400-24px/trip.svg?react';
import { Column }       from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import api from 'flavours/glitch/api';

const SCRAPERS = [
  { key: 'CentroItaliaEventsScraper',  label: 'Centro Italia' },
  { key: 'ComuneSanLorenzoScraper',    label: 'Comune San Lorenzo' },
  { key: 'LaVoceDiImperiaScraper',     label: 'La Voce di Imperia' },
];

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Confirm button — shows count, asks once, then acts ───────────────────────
const ConfirmDelete = ({ label, count, onConfirm, busy }) => {
  const [armed, setArmed] = useState(false);

  if (count === 0) return <span className='cm-zero'>Nothing to delete</span>;

  if (!armed) {
    return (
      <button className='cm-btn cm-btn--danger' onClick={() => setArmed(true)} disabled={busy}>
        <DeleteIcon /> Delete {count}
      </button>
    );
  }

  return (
    <div className='cm-confirm-row'>
      <span className='cm-confirm-label'>Delete {count} {label}?</span>
      <button className='cm-btn cm-btn--danger' onClick={() => { setArmed(false); onConfirm(); }} disabled={busy}>
        Yes, delete
      </button>
      <button className='cm-btn cm-btn--secondary' onClick={() => setArmed(false)} disabled={busy}>
        Cancel
      </button>
    </div>
  );
};

// ── Result toast ──────────────────────────────────────────────────────────────
const Toast = ({ message, onDismiss }) => (
  <div className='cm-toast' onClick={onDismiss}>{message} ✕</div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
const CommunityMaintenance = ({ multiColumn }) => {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [toast,   setToast]   = useState(null);
  const [listingDays, setListingDays] = useState(30);
  const [logDays,     setLogDays]     = useState(30);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await api().get('/api/v1/community_maintenance/stats');
      setStats(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const act = useCallback(async (method, path, params = {}, label) => {
    setBusy(true);
    try {
      const res = await api()[method](`/api/v1/community_maintenance/${path}`, { params });
      showToast(`${label}: ${res.data.deleted ?? 'done'}`);
      await loadStats();
    } catch {
      showToast(`Error running ${label}`);
    } finally {
      setBusy(false);
    }
  }, [loadStats, showToast]);

  const post = useCallback(async (path, data = {}, label) => {
    setBusy(true);
    try {
      await api().post(`/api/v1/community_maintenance/${path}`, data);
      showToast(`${label} queued`);
      setTimeout(loadStats, 3000);
    } catch {
      showToast(`Error: ${label}`);
    } finally {
      setBusy(false);
    }
  }, [loadStats, showToast]);

  if (loading) return <Column><LoadingIndicator /></Column>;

  const s = stats;

  return (
    <Column bindToDocument={!multiColumn} label='Site Maintenance'>
      <ColumnHeader
        icon='build'
        iconComponent={TuneIcon}
        title='Site Maintenance'
        multiColumn={multiColumn}
        showBackButton
      />
      <Helmet><title>Site Maintenance · miacivezza</title></Helmet>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <div className='cm-page'>

        {/* ── Quick Actions ───────────────────────────────────────── */}
        <section className='cm-section cm-section--quick'>
          <h2 className='cm-section__title'>Quick Actions</h2>
          <div className='cm-quick-row'>
            <button className='cm-btn cm-btn--action' onClick={() => post('run_all_scrapers', {}, 'All scrapers')} disabled={busy}>
              <PlayIcon /> Run All Scrapers
            </button>
            <button className='cm-btn cm-btn--action' onClick={() => post('run_vacuum', {}, 'Vacuum')} disabled={busy}>
              <DatabaseIcon /> Run Vacuum
            </button>
          </div>
        </section>

        {/* ── Events ─────────────────────────────────────────────── */}
        <section className='cm-section'>
          <h2 className='cm-section__title'>
            <CelebrationIcon className='cm-section__icon' /> Events
          </h2>
          <div className='cm-stat-row'>
            <span className='cm-stat'><strong>{s.events.upcoming}</strong> upcoming</span>
            <span className='cm-stat cm-stat--warn'><strong>{s.events.past}</strong> past</span>
            <span className='cm-stat'><strong>{s.events.pending}</strong> pending approval</span>
          </div>
          <div className='cm-action-row'>
            <ConfirmDelete
              label='past events'
              count={s.events.past}
              busy={busy}
              onConfirm={() => act('delete', 'past_events', {}, 'Past events deleted')}
            />
            <span className='cm-hint'>Removes all events with a date before today</span>
          </div>
        </section>

        {/* ── Listings ───────────────────────────────────────────── */}
        <section className='cm-section'>
          <h2 className='cm-section__title'>
            <TagIcon className='cm-section__icon' /> Listings
          </h2>
          <div className='cm-stat-row'>
            <span className='cm-stat'><strong>{s.listings.open}</strong> open</span>
            <span className='cm-stat'><strong>{s.listings.fulfilled}</strong> fulfilled</span>
            <span className='cm-stat'><strong>{s.listings.closed}</strong> closed</span>
            <span className='cm-stat cm-stat--warn'><strong>{s.listings.stale}</strong> stale (&gt;30 days)</span>
          </div>
          <div className='cm-action-row'>
            <label className='cm-label'>
              Delete fulfilled/closed older than
              <input
                type='number' min={1} max={365}
                className='cm-input-num'
                value={listingDays}
                onChange={e => setListingDays(Number(e.target.value))}
              />
              days
            </label>
            <ConfirmDelete
              label={`listings older than ${listingDays} days`}
              count={s.listings.stale}
              busy={busy}
              onConfirm={() => act('delete', 'stale_listings', { days: listingDays }, 'Stale listings deleted')}
            />
          </div>
        </section>

        {/* ── Visits ─────────────────────────────────────────────── */}
        <section className='cm-section'>
          <h2 className='cm-section__title'>
            <TripIcon className='cm-section__icon' /> Visits
          </h2>
          <div className='cm-stat-row'>
            <span className='cm-stat'><strong>{s.visits.active}</strong> in town now</span>
            <span className='cm-stat'><strong>{s.visits.upcoming}</strong> upcoming</span>
            <span className='cm-stat cm-stat--warn'><strong>{s.visits.past}</strong> past</span>
          </div>
          <div className='cm-action-row'>
            <ConfirmDelete
              label='past visits'
              count={s.visits.past}
              busy={busy}
              onConfirm={() => act('delete', 'past_visits', {}, 'Past visits deleted')}
            />
            <span className='cm-hint'>Removes visits where departure date is before today</span>
          </div>
        </section>

        {/* ── Scrapers ───────────────────────────────────────────── */}
        <section className='cm-section'>
          <h2 className='cm-section__title'>
            <HistoryIcon className='cm-section__icon' /> Scrapers
          </h2>
          <div className='cm-scraper-grid'>
            {SCRAPERS.map(sc => {
              const log = s.scrapers.find(r => r.source.includes(sc.label.split(' ')[0])) || s.scrapers.find(r => r.source === sc.key);
              const failed = log?.status === 'failed';
              return (
                <div key={sc.key} className={`cm-scraper-card${failed ? ' cm-scraper-card--failed' : ''}`}>
                  <div className='cm-scraper-card__name'>{sc.label}</div>
                  {log ? (
                    <>
                      <div className={`cm-scraper-card__status cm-scraper-card__status--${log.status}`}>{log.status}</div>
                      <div className='cm-scraper-card__meta'>Last run: {fmtDate(log.ran_at)}</div>
                      <div className='cm-scraper-card__meta'>{log.fetched} fetched · {log.imported} imported · {log.skipped} skipped</div>
                      {failed && log.error_message && (
                        <div className='cm-scraper-card__error'>{log.error_message}</div>
                      )}
                    </>
                  ) : (
                    <div className='cm-scraper-card__meta'>Never run</div>
                  )}
                  <button
                    className='cm-btn cm-btn--action cm-btn--sm'
                    onClick={() => post('run_scraper', { scraper: sc.key }, sc.label)}
                    disabled={busy}
                  >
                    <PlayIcon /> Run now
                  </button>
                </div>
              );
            })}
          </div>

          <div className='cm-action-row cm-action-row--mt'>
            <label className='cm-label'>
              Clear log entries older than
              <input
                type='number' min={1} max={365}
                className='cm-input-num'
                value={logDays}
                onChange={e => setLogDays(Number(e.target.value))}
              />
              days
            </label>
            <ConfirmDelete
              label='log entries'
              count={s.storage.old_logs}
              busy={busy}
              onConfirm={() => act('delete', 'scraper_logs', { days: logDays }, 'Scraper logs cleared')}
            />
            <span className='cm-hint'>{s.storage.log_entries} total log entries</span>
          </div>
        </section>

        {/* ── Storage ────────────────────────────────────────────── */}
        <section className='cm-section'>
          <h2 className='cm-section__title'>
            <DatabaseIcon className='cm-section__icon' /> Storage
          </h2>
          <div className='cm-stat-row'>
            <span className='cm-stat'><strong>{s.storage.protected_ids}</strong> media files protected from vacuum</span>
            <span className='cm-stat cm-stat--warn'><strong>{s.storage.orphaned}</strong> orphaned attachments (will be cleaned next vacuum)</span>
          </div>
          <div className='cm-action-row'>
            <button
              className='cm-btn cm-btn--action'
              onClick={() => post('run_vacuum', {}, 'Vacuum')}
              disabled={busy}
            >
              <PlayIcon /> Run Vacuum Now
            </button>
            <span className='cm-hint'>Deletes orphaned media and frees disk space immediately</span>
          </div>
        </section>

      </div>
    </Column>
  );
};

export default CommunityMaintenance;
