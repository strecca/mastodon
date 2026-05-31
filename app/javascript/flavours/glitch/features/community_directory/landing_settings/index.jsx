import { useCallback, useEffect, useState } from 'react';

import { useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import api from 'flavours/glitch/api';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';

const FIELDS = [
  { key: 'site_name',     label: 'Site name',     type: 'input',    hint: 'Main heading on the landing page (e.g. Centro Comunitario)' },
  { key: 'site_subtitle', label: 'Subtitle',      type: 'input',    hint: 'Line below the site name (e.g. Mia Civezza al Mare)' },
  { key: 'tagline',       label: 'Tagline',       type: 'textarea', hint: 'Short description shown in the hero section' },
  { key: 'join_heading',  label: 'Join heading',  type: 'input',    hint: 'Heading of the sign-up CTA section' },
  { key: 'join_body',     label: 'Join body',     type: 'textarea', hint: 'Paragraph text in the sign-up CTA section' },
];

const LandingSettings = ({ multiColumn }) => {
  const history = useHistory();

  const [form,    setForm]    = useState({ site_name: '', site_subtitle: '', tagline: '', join_heading: '', join_body: '' });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    api().get('/api/v1/community_landing')
      .then(res => { setForm(res.data); setLoading(false); })
      .catch(() => { setError('Could not load settings.'); setLoading(false); });
  }, []);

  const handleChange = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api().patch('/api/v1/community_landing', form);
      setSaved(true);
    } catch (err) {
      setError(err?.response?.data?.errors?.join(', ') ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [form]);

  const handleBack = useCallback(() => history.push('/landing'), [history]);

  return (
    <Column>
      <ColumnHeader
        title='Landing Page Settings'
        showBackButton
        multiColumn={multiColumn}
        onClick={handleBack}
      />
      <Helmet><title>Landing Page Settings</title></Helmet>

      <div className='cl-landing-settings scrollable'>
        {loading ? (
          <p className='cl-landing-settings__loading'>Loading…</p>
        ) : (
          <form className='cl-landing-settings__form' onSubmit={handleSubmit}>
            {FIELDS.map(({ key, label, type, hint }) => (
              <div key={key} className='cl-landing-settings__field'>
                <label className='cl-landing-settings__label' htmlFor={`ls-${key}`}>
                  {label}
                </label>
                {hint && <span className='cl-landing-settings__hint'>{hint}</span>}
                {type === 'textarea' ? (
                  <textarea
                    id={`ls-${key}`}
                    className='cl-landing-settings__textarea'
                    value={form[key] ?? ''}
                    rows={3}
                    onChange={e => handleChange(key, e.target.value)}
                  />
                ) : (
                  <input
                    id={`ls-${key}`}
                    type='text'
                    className='cl-landing-settings__input'
                    value={form[key] ?? ''}
                    onChange={e => handleChange(key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {error && <p className='cl-landing-settings__error'>{error}</p>}
            {saved  && <p className='cl-landing-settings__success'>Saved! Changes are live immediately.</p>}

            <div className='cl-landing-settings__actions'>
              <button type='submit' className='button' disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type='button' className='button button-secondary' onClick={handleBack}>
                Back to landing
              </button>
            </div>
          </form>
        )}
      </div>
    </Column>
  );
};

export default LandingSettings;
