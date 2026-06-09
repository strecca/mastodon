// Admin: browse and delete all entries for a specific category.
// Reached via /community_directory/entries/:categoryKey

import { useState, useEffect, useCallback } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';

import api from 'flavours/glitch/api';

const messages = defineMessages({
  title:         { id: 'community_directory.entries.title',          defaultMessage: 'Manage Entries — {category}' },
  back:          { id: 'community_directory.entries.back',           defaultMessage: '← Back to Admin' },
  all:           { id: 'community_directory.entries.filter_all',     defaultMessage: 'All' },
  approved:      { id: 'community_directory.entries.filter_approved', defaultMessage: 'Approved' },
  pending:       { id: 'community_directory.entries.filter_pending',  defaultMessage: 'Pending' },
  rejected:      { id: 'community_directory.entries.filter_rejected', defaultMessage: 'Rejected' },
  delete:        { id: 'community_directory.entries.delete',          defaultMessage: 'Delete' },
  deleteConfirm: { id: 'community_directory.entries.delete_confirm',  defaultMessage: 'Permanently delete "{name}"? This cannot be undone.' },
  empty:         { id: 'community_directory.entries.empty',           defaultMessage: 'No entries found.' },
  total:         { id: 'community_directory.entries.total',           defaultMessage: '{count} {count, plural, one {entry} other {entries}}' },
  by:            { id: 'community_directory.entries.by',              defaultMessage: 'by' },
});

const STATUS_FILTERS = ['all', 'approved', 'pending', 'rejected'];

const statusBadgeClass = (status) => {
  if (status === 'approved') return 'cd-entries__badge cd-entries__badge--approved';
  if (status === 'pending')  return 'cd-entries__badge cd-entries__badge--pending';
  return 'cd-entries__badge cd-entries__badge--rejected';
};

const CommunityDirectoryEntries = ({ params, multiColumn }) => {
  const intl        = useIntl();
  const categoryKey = params?.categoryKey || '';

  const [filter,       setFilter]       = useState('all');
  const [entries,      setEntries]      = useState([]);
  const [displayName,  setDisplayName]  = useState(categoryKey);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [deleting,     setDeleting]     = useState(null); // id being deleted

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api()
      .get('/api/v1/community_directory/admin_entries', {
        params: { category: categoryKey, status: filter },
      })
      .then(res => {
        setEntries(res.data.entries || []);
        setTotal(res.data.total || 0);
        setDisplayName(res.data.display_name || categoryKey);
      })
      .catch(() => setError('Failed to load entries.'))
      .finally(() => setLoading(false));
  }, [categoryKey, filter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback((entry) => {
    const msg = intl.formatMessage(messages.deleteConfirm, { name: entry.name });
    if (!window.confirm(msg)) return;
    setDeleting(entry.id);
    api()
      .delete(`/api/v1/community_directory/admin_entries/${entry.id}`, {
        params: { category: categoryKey },
      })
      .then(() => {
        setEntries(prev => prev.filter(e => e.id !== entry.id));
        setTotal(prev => Math.max(0, prev - 1));
      })
      .catch(() => alert('Delete failed — try again.'))
      .finally(() => setDeleting(null));
  }, [intl, categoryKey]);

  const title = intl.formatMessage(messages.title, { category: displayName });

  return (
    <Column bindToDocument={!multiColumn} label={title}>
      <ColumnHeader icon='shield' title={title} multiColumn={multiColumn} showBackButton />

      <div className='scrollable'>
        <div className='cd-entries'>

          <div className='cd-entries__nav'>
            <Link to='/community_directory' className='button button-secondary'>
              {intl.formatMessage(messages.back)}
            </Link>
            {total > 0 && (
              <span className='cd-entries__total'>
                {intl.formatMessage(messages.total, { count: total })}
              </span>
            )}
          </div>

          <div className='cd-entries__filters'>
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                type='button'
                className={`cd-entries__filter-btn${filter === f ? ' cd-entries__filter-btn--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {intl.formatMessage(messages[f])}
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingIndicator />
          ) : error ? (
            <div className='empty-column-indicator' style={{ color: '#c62828' }}>
              <p>{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className='empty-column-indicator'>
              {intl.formatMessage(messages.empty)}
            </div>
          ) : (
            <table className='cd-entries__table'>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className='cd-entries__row'>
                    <td className='cd-entries__cell cd-entries__cell--name'>
                      <Link to={`/community_${entry.category_key}/${entry.id}`} className='cd-entries__entry-link'>
                        {entry.name}
                      </Link>
                      <span className='cd-entries__meta'>
                        {intl.formatMessage(messages.by)} @{entry.account?.username}
                        {' · '}
                        {new Date(entry.created_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className='cd-entries__cell cd-entries__cell--status'>
                      <span className={statusBadgeClass(entry.status)}>{entry.status}</span>
                    </td>
                    <td className='cd-entries__cell cd-entries__cell--actions'>
                      <button
                        type='button'
                        className='button button--destructive button--small'
                        onClick={() => handleDelete(entry)}
                        disabled={deleting === entry.id}
                      >
                        {intl.formatMessage(messages.delete)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Helmet>
        <title>{title}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

export default CommunityDirectoryEntries;
