import { useState, useEffect, useCallback } from 'react';

import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import api from 'flavours/glitch/api';

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const CommunityEntryNotifications = ({ multiColumn }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutedIds, setMutedIds] = useState(() => new Set());

  const load = useCallback(() => {
    setLoading(true);
    api().get('/api/v1/community_entry_notifications')
      .then((res) => setNotifications(res.data.notifications))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = useCallback((id) => {
    api().post(`/api/v1/community_entry_notifications/${id}/read`)
      .then(() => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))));
  }, []);

  const markAllRead = useCallback(() => {
    api().post('/api/v1/community_entry_notifications/read_all')
      .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))));
  }, []);

  const mute = useCallback((id) => {
    api().post(`/api/v1/community_entry_notifications/${id}/mute`)
      .then(() => setMutedIds((prev) => new Set(prev).add(id)));
  }, []);

  return (
    <Column>
      <ColumnHeader icon='notifications' title='Community Notifications' multiColumn={multiColumn} />
      <Helmet><title>Community Notifications · miacivezza</title></Helmet>
      <div className='cen-page'>
        {notifications.length > 0 && (
          <button type='button' className='cen-page__read-all' onClick={markAllRead}>
            Mark all as read
          </button>
        )}
        {loading && <div className='cen-page__loading'>Loading…</div>}
        {!loading && notifications.length === 0 && (
          <div className='cen-page__empty'>No notifications yet.</div>
        )}
        <ul className='cen-list'>
          {notifications.map((n) => (
            <li key={n.id} className={`cen-list__item${n.read ? '' : ' cen-list__item--unread'}`}>
              <Link to={n.url} onClick={() => !n.read && markRead(n.id)} className='cen-list__link'>
                {n.sender && (
                  <img src={n.sender.avatar} alt='' className='cen-list__avatar' />
                )}
                <div className='cen-list__body'>
                  <div className='cen-list__title'>
                    {n.kind === 'entry_response'
                      ? `${n.sender?.display_name || n.sender?.username} responded to a listing you're watching`
                      : `New in ${n.category_display_name}${n.sender ? ` — from ${n.sender.display_name || n.sender.username}` : ''}`}
                  </div>
                  <div className='cen-list__time'>{formatDate(n.created_at)}</div>
                </div>
              </Link>
              {!mutedIds.has(n.id) ? (
                <button type='button' className='cen-list__mute' onClick={() => mute(n.id)}>
                  Stop notifications like this
                </button>
              ) : (
                <span className='cen-list__muted'>Won&apos;t notify you about this again</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Column>
  );
};

export default CommunityEntryNotifications;
