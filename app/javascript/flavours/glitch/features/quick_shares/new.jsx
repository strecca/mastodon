import { useState, useCallback } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { withIdentity } from 'flavours/glitch/identity_context';
import api from 'flavours/glitch/api';

// Administrator (0x1) or manage_reports (0x10) -- matches
// Api::V1::CommunityQuickSharesController#require_moderator! server-side.
const CAN_CREATE = 0x11;

const QuickShareNew = ({ identity, multiColumn }) => {
  const history = useHistory();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = useCallback((e) => {
    setFile(e.target.files[0] ?? null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Choose a PDF file first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('pdf_file', file);
      const res = await api().post('/api/v1/community_quick_shares', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      history.push(`/shared/${res.data.slug}`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong');
      setSaving(false);
    }
  }, [caption, file, history]);

  const canCreate = identity.signedIn && !!(identity.permissions & CAN_CREATE);

  return (
    <Column>
      <ColumnHeader icon='description' title='Quick Share a PDF' multiColumn={multiColumn} />
      <Helmet><title>Quick Share a PDF · miacivezza</title></Helmet>
      <div className='qs-page'>
        {!canCreate ? (
          <p className='qs-page__denied'>You don&apos;t have access to this tool.</p>
        ) : (
          <form className='qs-form' onSubmit={handleSubmit}>
            <p className='qs-form__intro'>
              Upload a PDF and write a short caption. You&apos;ll get a page you can share right away —
              and, if you want, post about it yourself afterwards.
            </p>

            <label className='qs-form__label' htmlFor='qs-caption'>Caption</label>
            <textarea
              id='qs-caption'
              className='qs-form__textarea'
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder='What is this document?'
              rows={3}
              required
            />

            <label className='qs-form__label' htmlFor='qs-pdf'>PDF file</label>
            <input
              id='qs-pdf'
              className='qs-form__file'
              type='file'
              accept='application/pdf'
              onChange={handleFileChange}
              required
            />

            {error && <div className='qs-form__error'>{error}</div>}

            <button type='submit' className='qs-form__submit' disabled={saving}>
              {saving ? 'Uploading…' : 'Share it'}
            </button>
          </form>
        )}
        <Link to='/guide' className='qs-page__back'>← Back to How It Works</Link>
      </div>
    </Column>
  );
};

export default withIdentity(QuickShareNew);
