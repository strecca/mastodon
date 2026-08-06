import { useState, useEffect, useCallback, useRef } from 'react';

import { useIntl, defineMessages } from 'react-intl';
import { Link, useHistory } from 'react-router-dom';

const messages = defineMessages({
  compressingLarge: { id: 'community.upload.compressing', defaultMessage: 'Compressing large image ({mb} MB) — please wait…' },
  imageTooLarge:    { id: 'community.upload.too_large', defaultMessage: 'Image is too large ({mb} MB). Please resize to under 80 MB before uploading.' },
  uploadFailed:     { id: 'community.upload.failed', defaultMessage: 'Upload failed — please try again.' },
});

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import api from 'flavours/glitch/api';
import { useIdentity } from 'flavours/glitch/identity_context';

// Canvas draw always outputs sRGB, normalizing any input color profile (ACES, P3, AdobeRGB, etc.)
const compressImage = (file, onLargeFile) =>
  new Promise((resolve, reject) => {
    const sizeMB = Math.round(file.size / 1024 / 1024);
    if (sizeMB > 80) {
      const err = new Error('too_large');
      err.sizeMB = sizeMB;
      reject(err);
      return;
    }
    if (sizeMB > 10) onLargeFile?.(sizeMB);
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      if (file.type === 'image/jpeg' && img.width <= 1280 && img.height <= 1280) {
        resolve(file);
        return;
      }
      const scale = Math.min(1, 1280 / img.width, 1280 / img.height);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg', 0.82,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });

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
  const intl = useIntl();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setStatusMsg(null);
    try {
      const compressed = await compressImage(file, (mb) => setStatusMsg(intl.formatMessage(messages.compressingLarge, { mb })));
      setStatusMsg(null);
      const formData = new FormData();
      formData.append('file', compressed);
      const res = await api().post('/api/v1/media', formData);
      onUpload(index, res.data.id, res.data.url || res.data.preview_url);
    } catch (err) {
      setStatusMsg(err?.message === 'too_large'
        ? intl.formatMessage(messages.imageTooLarge, { mb: err.sizeMB })
        : intl.formatMessage(messages.uploadFailed));
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
          {uploading ? (statusMsg || 'Uploading…') : `+ Photo ${index + 1}`}
        </button>
      )}
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {!uploading && statusMsg && (
        <p className='ms-edit__photo-error'>{statusMsg}</p>
      )}
    </div>
  );
};

const MemberStoriesEdit = ({ multiColumn }) => {
  const { signedIn } = useIdentity();
  const history = useHistory();
  const [form, setForm]     = useState({ about_me: '', civezza_story: '', shaping_moment: '', why_i_joined: '', published: false });
  const [mediaIds, setMediaIds]   = useState([null, null, null]);
  const [photoUrls, setPhotoUrls] = useState([null, null, null]);
  const [loading, setSaving]      = useState(false);
  const [fetchDone, setFetchDone] = useState(false);
  const [error, setError]         = useState(null);
  const [saved, setSaved]         = useState(false);
  const [savedPublished, setSavedPublished] = useState(false);

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
        setSavedPublished(s.published || false);
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
      setSavedPublished(form.published);
    } catch (err) {
      setError(err.response?.data?.errors?.join(', ') ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, mediaIds]);

  if (!signedIn) {
    return (
      <Column className='col-stories'>
        <ColumnHeader icon='book' title='My Story' multiColumn={multiColumn} showBackButton className='ch-stories' />
        <div className='ms-page'>
          <p>Please <a href='/auth/sign_in'>sign in</a> to write your story.</p>
        </div>
      </Column>
    );
  }

  if (!fetchDone) {
    return (
      <Column className='col-stories'>
        <ColumnHeader icon='book' title='My Story' multiColumn={multiColumn} showBackButton className='ch-stories' />
        <LoadingIndicator />
      </Column>
    );
  }

  return (
    <Column className='col-stories'>
      <ColumnHeader icon='book' title='My Story' multiColumn={multiColumn} showBackButton className='ch-stories' />
      <Helmet><title>My Story · miacivezza</title></Helmet>

      <div className='ms-page ms-edit'>
        <div className='ms-hero'>
          <Link to='/landing' className='ms-hero__back'>← Community Directory</Link>
          <h2 className='ms-hero__title'>Member Stories</h2>
          <p className='ms-hero__subtitle'>Write My Story</p>
        </div>

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

          {/* ── How publishing works ── */}
          <div className='ms-edit__workflow'>
            <h3 className='ms-edit__workflow-title'>How it works</h3>
            <ol className='ms-edit__workflow-steps'>
              <li>Fill in as many sections as you like — you don&apos;t need to complete everything at once.</li>
              <li>Click <strong>Save Story</strong> at any time to preserve your work. Your story stays private until you publish it.</li>
              <li>When you&apos;re ready to share with other members: tick <strong>Publish my story</strong> below, then click <strong>Save Story</strong> again. That save is what makes it visible.</li>
            </ol>
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
            {form.published !== savedPublished && (
              <p className='ms-edit__publish-hint'>
                {form.published
                  ? '⬆ Click Save Story below to publish your story.'
                  : '⬆ Click Save Story below to unpublish your story.'}
              </p>
            )}
          </div>

          {error && <p className='ms-edit__error'>{error}</p>}
          {saved && (
            <p className='ms-edit__success'>
              {savedPublished ? 'Story saved and published!' : 'Story saved as a draft.'}
            </p>
          )}

          <div className='ms-edit__actions'>
            <button type='submit' className='button' disabled={loading}>
              {loading ? 'Saving…' : 'Save Story'}
            </button>
            {savedPublished && (
              <button
                type='button'
                className='button button-secondary'
                onClick={() => history.push('/member_stories')}
              >
                View All Stories
              </button>
            )}
          </div>
        </form>
      </div>
    </Column>
  );
};

export default MemberStoriesEdit;
