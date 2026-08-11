import { useState, useEffect, useCallback } from 'react';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import api from 'flavours/glitch/api';

const EMAIL_FREQUENCIES = [
  { value: 'never', label: 'Never' },
  { value: 'immediate', label: 'As soon as possible' },
  { value: 'digest', label: 'Once-daily digest' },
];

const NotificationSettings = ({ multiColumn }) => {
  const [categories, setCategories] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    Promise.all([
      api().get('/api/v1/community_directory/categories'),
      api().get('/api/v1/member_notification_category_subscriptions'),
      api().get('/api/v1/member_notification_targets'),
      api().get('/api/v1/member_notification_preferences'),
    ]).then(([categoriesRes, subsRes, targetsRes, prefsRes]) => {
      setCategories(categoriesRes.data);
      setSubscriptions(subsRes.data);
      setTargets(targetsRes.data);
      setPreferences(prefsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const isSubscribed = useCallback(
    (categoryKey) => subscriptions.some((s) => s.category_key === categoryKey),
    [subscriptions],
  );

  const toggleCategory = useCallback((categoryKey) => {
    const existing = subscriptions.find((s) => s.category_key === categoryKey);
    if (existing) {
      api().delete(`/api/v1/member_notification_category_subscriptions/${existing.id}`)
        .then(() => setSubscriptions((prev) => prev.filter((s) => s.id !== existing.id)));
    } else {
      api().post('/api/v1/member_notification_category_subscriptions', { category_key: categoryKey })
        .then((res) => setSubscriptions((prev) => [...prev, res.data]));
    }
  }, [subscriptions]);

  const searchAccounts = useCallback((value) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    api().get('/api/v1/accounts/search', { params: { q: value, limit: 5 } })
      .then((res) => setResults(res.data));
  }, []);

  const addTarget = useCallback((account) => {
    api().post('/api/v1/member_notification_targets', { target_account_id: account.id })
      .then((res) => {
        setTargets((prev) => [...prev, res.data]);
        setQuery('');
        setResults([]);
      });
  }, []);

  const removeTarget = useCallback((id) => {
    api().delete(`/api/v1/member_notification_targets/${id}`)
      .then(() => setTargets((prev) => prev.filter((t) => t.id !== id)));
  }, []);

  const updatePreference = useCallback((patch) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  }, []);

  const savePreferences = useCallback(() => {
    setSaving(true);
    api().put('/api/v1/member_notification_preferences', preferences)
      .then((res) => {
        setPreferences(res.data);
        setSavedAt(new Date());
      })
      .finally(() => setSaving(false));
  }, [preferences]);

  if (loading || !preferences) {
    return (
      <Column>
        <ColumnHeader icon='notifications' title='Notification Settings' multiColumn={multiColumn} />
        <div className='ns-page ns-page--loading'>Loading…</div>
      </Column>
    );
  }

  return (
    <Column>
      <ColumnHeader icon='notifications' title='Notification Settings' multiColumn={multiColumn} />
      <Helmet><title>Notification Settings · miacivezza</title></Helmet>
      <div className='ns-page'>
        <section className='ns-section'>
          <h3>What would you like to hear about?</h3>
          <p className='ns-section__hint'>Choose which Community Directory categories notify you when someone posts something new.</p>
          <div className='ns-categories'>
            {categories.map((c) => (
              <label key={c.name} className='ns-categories__item'>
                <input
                  type='checkbox'
                  checked={isSubscribed(c.name)}
                  onChange={() => toggleCategory(c.name)}
                />
                {c.display_name}
              </label>
            ))}
          </div>
        </section>

        <section className='ns-section'>
          <h3>Always notify me about</h3>
          <p className='ns-section__hint'>Specific members whose posts you want to hear about, regardless of category.</p>
          <div className='ns-targets'>
            {targets.map((t) => (
              <span key={t.id} className='ns-targets__chip'>
                @{t.account.username}
                <button type='button' onClick={() => removeTarget(t.id)} aria-label='Remove'>×</button>
              </span>
            ))}
          </div>
          <div className='ns-targets__search'>
            <input
              type='text'
              placeholder='Search for a member…'
              value={query}
              onChange={(e) => searchAccounts(e.target.value)}
            />
            {results.length > 0 && (
              <ul className='ns-targets__results'>
                {results.map((account) => (
                  <li key={account.id}>
                    <button type='button' onClick={() => addTarget(account)}>
                      @{account.username} — {account.display_name || account.username}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className='ns-section'>
          <h3>Quiet hours</h3>
          <p className='ns-section__hint'>Push notifications will hold off during this window and arrive once it ends.</p>
          <label className='ns-quiet__enabled'>
            <input
              type='checkbox'
              checked={preferences.quiet_hours_enabled}
              onChange={(e) => updatePreference({ quiet_hours_enabled: e.target.checked })}
            />
            Enable quiet hours
          </label>
          {preferences.quiet_hours_enabled && (
            <div className='ns-quiet__times'>
              <label>
                From
                <input
                  type='time'
                  value={preferences.quiet_hours_start || ''}
                  onChange={(e) => updatePreference({ quiet_hours_start: e.target.value })}
                />
              </label>
              <label>
                To
                <input
                  type='time'
                  value={preferences.quiet_hours_end || ''}
                  onChange={(e) => updatePreference({ quiet_hours_end: e.target.value })}
                />
              </label>
              <label>
                Timezone
                <input
                  type='text'
                  placeholder='Europe/Rome'
                  value={preferences.quiet_hours_timezone || ''}
                  onChange={(e) => updatePreference({ quiet_hours_timezone: e.target.value })}
                />
              </label>
            </div>
          )}
        </section>

        <section className='ns-section'>
          <h3>Email</h3>
          <select
            value={preferences.email_frequency}
            onChange={(e) => updatePreference({ email_frequency: e.target.value })}
          >
            {EMAIL_FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </section>

        <div className='ns-save'>
          <button type='button' onClick={savePreferences} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {savedAt && <span className='ns-save__confirm'>Saved</span>}
        </div>
      </div>
    </Column>
  );
};

export default NotificationSettings;
