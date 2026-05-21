import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from '@unhead/react/helmet';
import { Column }       from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';
import {
  fetchNotifPrefs,
  updateNotifPrefs,
  fetchVisitNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from 'flavours/glitch/actions/community_visits';
import ChevronLeftIcon from '@/material-icons/400-24px/chevron_left.svg?react';
import ChevronRightIcon from '@/material-icons/400-24px/chevron_right.svg?react';
import DoneAllIcon from '@/material-icons/400-24px/done_all.svg?react';

// ── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_FREQUENCY_OPTIONS = [
  { value: 'never',        label: 'Never' },
  { value: 'immediate',    label: 'Immediately' },
  { value: 'daily_digest', label: 'Daily digest' },
  { value: 'weekly_digest', label: 'Weekly digest' },
];

const KIND_LABELS = {
  overlap_detected: 'Visit overlap',
  friend_ping:      'Connection ping',
  visit_updated:    'Visit updated',
  new_member_joined: 'New member',
};

const KIND_DESCRIPTIONS = {
  overlap_detected: 'A connection has a visit that overlaps with yours',
  friend_ping:      'A connection sent you a personal visit ping',
  visit_updated:    'Someone updated a visit you were notified about',
  new_member_joined: 'A new member joined the community',
};

// ── Preferences tab ───────────────────────────────────────────────────────────

const PreferencesTab = () => {
  const dispatch    = useAppDispatch();
  const prefs       = useAppSelector(s => s.getIn(['community_visits', 'notifPrefs']));
  const prefsLoaded = useAppSelector(s => s.getIn(['community_visits', 'notifPrefsLoaded']));
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    if (!prefsLoaded) dispatch(fetchNotifPrefs());
  }, [dispatch, prefsLoaded]);

  const handleToggle = useCallback(async (field) => {
    const current = prefs.get(field);
    setSaving(true);
    setSaved(false);
    try {
      await dispatch(updateNotifPrefs({ [field]: !current }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [dispatch, prefs]);

  const handleEmailFreq = useCallback(async (value) => {
    setSaving(true);
    setSaved(false);
    try {
      await dispatch(updateNotifPrefs({ email_frequency: value }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [dispatch]);

  if (!prefsLoaded) {
    return <div className='cv-notif-prefs__loading'>Loading preferences…</div>;
  }

  return (
    <div className='cv-notif-prefs'>
      {/* ── Email frequency ── */}
      <section className='cv-notif-prefs__section'>
        <h3 className='cv-notif-prefs__section-title'>Email notifications</h3>
        <p className='cv-notif-prefs__section-desc'>How often should we email you about visit activity?</p>
        <div className='cv-notif-prefs__freq-options'>
          {EMAIL_FREQUENCY_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`cv-notif-prefs__freq-option${prefs.get('email_frequency') === opt.value ? ' cv-notif-prefs__freq-option--active' : ''}`}
            >
              <input
                type='radio'
                name='email_frequency'
                value={opt.value}
                checked={prefs.get('email_frequency') === opt.value}
                onChange={() => handleEmailFreq(opt.value)}
                disabled={saving}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      {/* ── What to notify about ── */}
      <section className='cv-notif-prefs__section'>
        <h3 className='cv-notif-prefs__section-title'>Notify me about</h3>
        {[
          { field: 'on_visit_overlap', label: 'Visit overlaps',           desc: KIND_DESCRIPTIONS.overlap_detected },
          { field: 'on_friend_ping',   label: 'Connection pings',         desc: KIND_DESCRIPTIONS.friend_ping },
          { field: 'on_new_member',    label: 'New members joining',      desc: 'Get a notification when someone new joins the community' },
        ].map(({ field, label, desc }) => (
          <div key={field} className='cv-notif-prefs__toggle-row'>
            <div className='cv-notif-prefs__toggle-info'>
              <span className='cv-notif-prefs__toggle-label'>{label}</span>
              <span className='cv-notif-prefs__toggle-desc'>{desc}</span>
            </div>
            <button
              className={`cv-notif-prefs__toggle${prefs.get(field) ? ' cv-notif-prefs__toggle--on' : ''}`}
              onClick={() => handleToggle(field)}
              disabled={saving}
              aria-pressed={prefs.get(field) ? 'true' : 'false'}
              aria-label={`${label}: ${prefs.get(field) ? 'on' : 'off'}`}
            >
              <span className='cv-notif-prefs__toggle-knob' />
            </button>
          </div>
        ))}
      </section>

      {saved && (
        <div className='cv-notif-prefs__saved-banner'>Preferences saved</div>
      )}
    </div>
  );
};

// ── Inbox tab ─────────────────────────────────────────────────────────────────

const fmtRelativeDate = (iso) => {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const InboxTab = () => {
  const dispatch      = useAppDispatch();
  const notifications = useAppSelector(s => s.getIn(['community_visits', 'notifications']));
  const page          = useAppSelector(s => s.getIn(['community_visits', 'notifPage']));
  const pages         = useAppSelector(s => s.getIn(['community_visits', 'notifPages']));
  const unreadCount   = useAppSelector(s => s.getIn(['community_visits', 'unreadCount']));

  useEffect(() => {
    dispatch(fetchVisitNotifications(1));
  }, [dispatch]);

  const loadPage = useCallback((p) => {
    dispatch(fetchVisitNotifications(p));
  }, [dispatch]);

  const handleMarkRead = useCallback((id) => {
    dispatch(markNotificationRead(id));
  }, [dispatch]);

  const handleMarkAll = useCallback(() => {
    dispatch(markAllNotificationsRead());
  }, [dispatch]);

  return (
    <div className='cv-notif-inbox'>
      <div className='cv-notif-inbox__toolbar'>
        <span className='cv-notif-inbox__unread'>
          {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
        </span>
        {unreadCount > 0 && (
          <button className='cv-icon-btn' title='Mark all as read' onClick={handleMarkAll}>
            <DoneAllIcon /> <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.size === 0 ? (
        <div className='cv-notif-inbox__empty'>
          No notifications yet. When connections have overlapping visits or ping you, they'll appear here.
        </div>
      ) : (
        <ul className='cv-notif-inbox__list'>
          {notifications.map(n => {
            const sender = n.get('sender');
            const visit  = n.get('visit');
            const isRead = n.get('read');
            const kind   = n.get('kind');
            return (
              <li
                key={n.get('id')}
                className={`cv-notif-inbox__item${isRead ? '' : ' cv-notif-inbox__item--unread'}`}
              >
                {sender && (
                  <img
                    className='cv-notif-inbox__avatar'
                    src={sender.get('avatar')}
                    alt={sender.get('username')}
                  />
                )}
                <div className='cv-notif-inbox__body'>
                  <div className='cv-notif-inbox__kind'>{KIND_LABELS[kind] || kind}</div>
                  <div className='cv-notif-inbox__text'>
                    {sender && (
                      <strong>{sender.get('display_name') || `@${sender.get('username')}`}</strong>
                    )}{' '}
                    {kind === 'overlap_detected' && 'will be in town at the same time as you'}
                    {kind === 'friend_ping' && 'wants to connect during your visit'}
                    {kind === 'visit_updated' && 'updated their visit'}
                    {kind === 'new_member_joined' && 'just joined the community'}
                    {n.get('message') && (
                      <span className='cv-notif-inbox__message'> — "{n.get('message')}"</span>
                    )}
                  </div>
                  {visit && (
                    <div className='cv-notif-inbox__visit-dates'>
                      {new Date(visit.get('arrival_date') + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      {' – '}
                      {new Date(visit.get('departure_date') + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                  <div className='cv-notif-inbox__time'>{fmtRelativeDate(n.get('created_at'))}</div>
                </div>
                {!isRead && (
                  <button
                    className='cv-notif-inbox__read-btn'
                    title='Mark as read'
                    onClick={() => handleMarkRead(n.get('id'))}
                  >
                    ✓
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className='cv-notif-inbox__pagination'>
          <button
            className='cv-nav-btn'
            disabled={page <= 1}
            onClick={() => loadPage(page - 1)}
            aria-label='Previous page'
          >
            <ChevronLeftIcon />
          </button>
          <span className='cv-notif-inbox__page-info'>Page {page} of {pages}</span>
          <button
            className='cv-nav-btn'
            disabled={page >= pages}
            onClick={() => loadPage(page + 1)}
            aria-label='Next page'
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const CommunityVisitsNotifications = ({ multiColumn }) => {
  const [activeTab, setActiveTab] = useState('inbox');

  return (
    <Column bindToDocument={!multiColumn} label='Visit Notifications'>
      <ColumnHeader
        title='Visit Notifications'
        icon='notifications'
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='cv-page'>
        <div className='cv-notif-tabs'>
          <button
            className={`cv-notif-tabs__tab${activeTab === 'inbox' ? ' cv-notif-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('inbox')}
          >
            Inbox
          </button>
          <button
            className={`cv-notif-tabs__tab${activeTab === 'prefs' ? ' cv-notif-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('prefs')}
          >
            Settings
          </button>
        </div>

        {activeTab === 'inbox' ? <InboxTab /> : <PreferencesTab />}

        <div className='cv-notif-footer'>
          <Link to='/community_visits' className='cv-notif-footer__link'>← Back to calendar</Link>
        </div>
      </div>

      <Helmet>
        <title>Visit Notifications</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

export default CommunityVisitsNotifications;
