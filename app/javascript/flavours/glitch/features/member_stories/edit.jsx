import { useState, useEffect, useCallback, useRef } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import api from 'flavours/glitch/api';
import { withIdentity } from 'flavours/glitch/identity_context';

const FIELDS = [
  {
    key:         'about_me',
    label:       'About Me',
    prompt:      'Who are you? Your background, work, passions, family — what makes you tick.',
    placeholder: 'I grew up in…',
  },
  {
    key:         'civezza_story',
    label:       'My Connection to Civezza',
    prompt:      'How did you come to know Civezza or the Imperia area? What first brought you here, and what keeps drawing you back?',
    placeholder: 'My first visit was…',
  },
  {
    key:         'shaping_moment',
    label:       'A Moment That Shaped Me',
    prompt:      'Share a memory or experience — from Civezza or anywhere — that shaped who you are today.',
    placeholder: 'There was a summer when…',
  },
  {
    key:         'why_i_joined',
    label:       'Why I Joined MiaCivezza.com',
    prompt:      'What brought you here, and what are you hoping to connect with or contribute to this community?',
    placeholder: 'I joined because…',
  },
];

const PhotoSlot = ({ index, currentUrl, currentMediaId, onUpload, onRemove }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api().post('/api/v1/media', formData);
      onUpload(index, res.data.id, res.data.url || res.data.preview_url);
    } catch {
      // keep slot as-is on failure
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [index, onUpload]);

  return (
    <div className='ms-edit__photo-slot'>
      {currentUrl ? (
        <div className='ms-edit__photo-preview'>
          <img src={currentUrl} alt={`Photo ${index + 1}`} />
          <button
            type='button'
            className='ms-edit__photo-remove'
            onClick={() => onRemove(index)}
            aria-label='Remove photo'
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type='button'
          className='ms-edit__photo-add'
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : `+ Photo ${index + 1}`}
        </button>
      )}
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
};

const MemberStoriesEdit = ({ multiColumn, signedIn }) => {
  const history = useHistory();
  const [form, setForm]     = useState({ about_me: '', civezza_story: '', shaping_moment: '', why_i_joined: '', published: false });
  const [mediaIds, setMediaIds]   = useState([null, null, null]);
  const [photoUrls, setPhotoUrls] = useState([null, null, null]);
  const [loading, setSaving]  = useState(false);
  const [fetchDone, setFetchDone] = useState(false);
  const [error, setError]   = useState(null);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    api().get('/api/v1/civezza_member_stories/me')
      .then(res => {
        const s = res.data;
        setForm({
          about_me:       s.about_me       || '',
          civezza_story:  s.civezza_story  || '',
          shaping_moment: s.shaping_moment || '',
          why_i_joined:   s.why_i_joined   || '',
          published:      s.published      || false,
        });
        const ids  = (s.image_media_ids || []).concat([null, null, null]).slice(0, 3);
        const urls = (s.images          || []).concat([null, null, null]).slice(0, 3);
        setMediaIds(ids);
        setPhotoUrls(urls);
      })
      .catch(() => {})
      .finally(() => setFetchDone(true));
  }, [signedIn]);

  const handleChange = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  const handleUpload = useCallback((index, mediaId, url) => {
    setMediaIds(ids => { const next = [...ids]; next[index] = mediaId; return next; });
    setPhotoUrls(urls => { const next = [...urls]; next[index] = url; return next; });
    setSaved(false);
  }, []);

  const handleRemove = useCallback((index) => {
    setMediaIds(ids => { const next = [...ids]; next[index] = null; return next; });
    setPhotoUrls(urls => { const next = [...urls]; next[index] = null; return next; });
    setSaved(false);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api().post('/api/v1/civezza_member_stories/upsert', {
        ...form,
        media_ids: mediaIds.filter(Boolean),
      });
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.errors?.join(', ') ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, mediaIds]);

  if (!signedIn) {
    return (
      <Column>
        <ColumnHeader icon='book' title='My Story' multiColumn={multiColumn} />
        <div className='ms-page'>
          <p>Please <a href='/auth/sign_in'>sign in</a> to write your story.</p>
        </div>
      </Column>
    );
  }

  if (!fetchDone) {
    return (
      <Column>
        <ColumnHeader icon='book' title='My Story' multiColumn={multiColumn} />
        <LoadingIndicator />
      </Column>
    );
  }

  return (
    <Column>
      <ColumnHeader icon='book' title='My Story' multiColumn={multiColumn} />
      <Helmet><title>My Story · miacivezza</title></Helmet>

      <div className='ms-page ms-edit'>
        <Link to='/member_stories' className='ms-story__back'>← All Stories</Link>

        <p className='ms-edit__intro'>
          Share a bit about yourself with the Civezza community. Answer as many or as few prompts as you like —
          your story is yours to tell. When you&apos;re ready, tick <strong>Publish</strong> so others can read it.
        </p>

        <form onSubmit={handleSubmit}>
          {/* ── Text fields ── */}
          {FIELDS.map(({ key, label, prompt, placeholder }) => (
            <div key={key} className='ms-edit__field'>
              <label className='ms-edit__label' htmlFor={`ms-${key}`}>{label}</label>
              <p className='ms-edit__prompt'>{prompt}</p>
              <textarea
                id={`ms-${key}`}
                className='ms-edit__textarea'
                value={form[key]}
                placeholder={placeholder}
                rows={5}
                onChange={e => handleChange(key, e.target.value)}
              />
            </div>
          ))}

          {/* ── Photos ── */}
          <div className='ms-edit__field'>
            <label className='ms-edit__label'>Photos <span className='ms-edit__label-hint'>(up to 3)</span></label>
            <p className='ms-edit__prompt'>
              Add photos that are meaningful to you — places you love, you at work or play, or Civezza memories.
            </p>
            <div className='ms-edit__photos'>
              {[0, 1, 2].map(i => (
                <PhotoSlot
                  key={i}
                  index={i}
                  currentUrl={photoUrls[i]}
                  currentMediaId={mediaIds[i]}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>

          {/* ── Publish toggle ── */}
          <div className='ms-edit__publish-row'>
            <label className='ms-edit__publish-label'>
              <input
                type='checkbox'
                checked={form.published}
                onChange={e => handleChange('published', e.target.checked)}
              />
              <span>Publish my story — make it visible to other members</span>
            </label>
          </div>

          {error && <p className='ms-edit__error'>{error}</p>}
          {saved && <p className='ms-edit__success'>Story saved!</p>}

          <div className='ms-edit__actions'>
            <button type='submit' className='button' disabled={loading}>
              {loading ? 'Saving…' : 'Save Story'}
            </button>
            {form.published && (
              <Link
                to={`/member_stories/me`}
                className='button button-secondary'
                onClick={e => {
                  // We don't have account_id here; redirect to list instead
                  e.preventDefault();
                  history.push('/member_stories');
                }}
              >
                View Stories
              </Link>
            )}
          </div>
        </form>
      </div>
    </Column>
  );
};

export default withIdentity(MemberStoriesEdit);
