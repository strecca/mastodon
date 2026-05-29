import { useState, useEffect, useCallback } from 'react';

import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import api from 'flavours/glitch/api';

const STATUS_META = {
  ok:     { label: 'OK',     color: '#2e7d32' },
  empty:  { label: 'Empty',  color: '#e65100' },
  failed: { label: 'Failed', color: '#c62828' },
};

const fmtDatetime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const timeAgo = (iso) => {
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const StatusBadge = ({ status }) => {
  const { label, color } = STATUS_META[status] ?? { label: status, color: '#888' };
  return (
    <span className='scraper-logs__badge' style={{ '--badge-color': color }}>
      {label}
    </span>
  );
};

const LatestCard = ({ log }) => (
  <div className={`scraper-logs__source-card scraper-logs__source-card--${log.status}`}>
    <div className='scraper-logs__source-name'>{log.source_name}</div>
    <div className='scraper-logs__source-time' title={fmtDatetime(log.ran_at)}>
      Last run: {timeAgo(log.ran_at)}
    </div>
    <div className='scraper-logs__source-stats'>
      <span className='scraper-logs__stat'><strong>{log.fetched}</strong> fetched</span>
      <span className='scraper-logs__stat scraper-logs__stat--imported'><strong>{log.imported}</strong> imported</span>
      <span className='scraper-logs__stat'><strong>{log.skipped}</strong> skipped</span>
    </div>
    <StatusBadge status={log.status} />
    {log.error_message && (
      <div className='scraper-logs__error-msg'>{log.error_message}</div>
    )}
  </div>
);

const LogRow = ({ log }) => (
  <div className='scraper-logs__row'>
    <span className='scraper-logs__row-source'>{log.source_name}</span>
    <span className='scraper-logs__row-time' title={fmtDatetime(log.ran_at)}>{timeAgo(log.ran_at)}</span>
    <span className='scraper-logs__row-num'>{log.fetched}</span>
    <span className='scraper-logs__row-num scraper-logs__row-num--imported'>{log.imported}</span>
    <span className='scraper-logs__row-num'>{log.skipped}</span>
    <StatusBadge status={log.status} />
    {log.error_message && (
      <span className='scraper-logs__row-error' title={log.error_message}>⚠ error</span>
    )}
  </div>
);

export default function CommunityDirectoryScraperLogs ({ multiColumn }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api().get('/api/v1/community_directory/scraper_logs');
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Column>
      <ColumnHeader icon='history' title='Scraper Logs' multiColumn={multiColumn} />
      <Helmet><title>Scraper Logs · miacivezza</title></Helmet>

      <div className='scraper-logs'>
        <div className='scraper-logs__nav'>
          <Link to='/community_directory' className='scraper-logs__back'>← Community Admin</Link>
        </div>

        {loading && <LoadingIndicator />}
        {error   && <div className='scraper-logs__error'>{error}</div>}

        {data && (
          <>
            {data.latest.length === 0 ? (
              <div className='scraper-logs__empty'>
                No runs yet — the first log will appear after 02:00 tonight.
              </div>
            ) : (
              <div className='scraper-logs__sources'>{data.latest.map(l => <LatestCard key={l.source_name} log={l} />)}</div>
            )}

            {data.recent.length > 0 && (
              <div className='scraper-logs__history'>
                <div className='scraper-logs__history-title'>Run history</div>
                <div className='scraper-logs__table-head'>
                  <span>Source</span>
                  <span>When</span>
                  <span>Fetched</span>
                  <span>Imported</span>
                  <span>Skipped</span>
                  <span>Status</span>
                </div>
                {data.recent.map(l => <LogRow key={l.id} log={l} />)}
              </div>
            )}
          </>
        )}
      </div>
    </Column>
  );
}
