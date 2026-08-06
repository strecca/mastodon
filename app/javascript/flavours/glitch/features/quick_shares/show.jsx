import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { withIdentity } from 'flavours/glitch/identity_context';
import api from 'flavours/glitch/api';

const QuickShareShow = ({ identity, multiColumn }) => {
  const { slug } = useParams();
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [composing, setComposing] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  const fetchShare = useCallback(async () => {
    try {
      const res = await api().get(`/api/v1/community_quick_shares/${slug}`);
      setShare(res.data);
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchShare(); }, [fetchShare]);

  const handleShareAsPost = useCallback(async () => {
    if (!postText.trim()) {
      setPostError('Write something first.');
      return;
    }
    setPosting(true);
    setPostError(null);
    try {
      const res = await api().post(`/api/v1/community_quick_shares/${slug}/share_as_post`, {
        text: postText,
      });
      setShare(res.data);
      setComposing(false);
    } catch (err) {
      setPostError(err.response?.data?.error ?? 'Something went wrong');
    } finally {
      setPosting(false);
    }
  }, [slug, postText]);

  if (loading) {
    return (
      <Column>
        <ColumnHeader icon='description' title='Quick Share' multiColumn={multiColumn} />
      </Column>
    );
  }

  if (notFound || !share) {
    return (
      <Column>
        <ColumnHeader icon='description' title='Quick Share' multiColumn={multiColumn} />
        <div className='qs-page'>
          <p className='qs-page__denied'>This page doesn&apos;t exist.</p>
        </div>
      </Column>
    );
  }

  const isOwner = identity.signedIn && identity.accountId === share.account.id;
  const isAdmin = identity.signedIn && !!(identity.permissions & 0x1);

  return (
    <Column>
      <ColumnHeader icon='description' title='Quick Share' multiColumn={multiColumn} />
      <Helmet><title>{share.caption.slice(0, 60)} · miacivezza</title></Helmet>
      <div className='qs-page'>
        <div className='qs-show'>
          <p className='qs-show__byline'>Shared by <strong>{share.account.display_name || share.account.username}</strong></p>
          <p className='qs-show__caption'>{share.caption}</p>

          {share.pdf_url && (
            <a
              href={share.pdf_url}
              className='qs-show__pdf-link'
              target='_blank'
              rel='noopener noreferrer'
              download={`${share.slug}.pdf`}
            >
              Download PDF
            </a>
          )}

          {(isOwner || isAdmin) && (
            <div className='qs-show__share-block'>
              {share.shared_as_post ? (
                <p className='qs-show__shared-note'>✓ Already shared as a post.</p>
              ) : composing ? (
                <div className='qs-show__compose'>
                  <textarea
                    className='qs-form__textarea'
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder='e.g. People have asked for my recipe, so here it is.'
                    rows={3}
                  />
                  <p className='qs-show__compose-hint'>
                    The link to this page will be added automatically to the end of your post.
                  </p>
                  {postError && <div className='qs-form__error'>{postError}</div>}
                  <div className='qs-show__compose-actions'>
                    <button type='button' className='qs-form__submit' onClick={handleShareAsPost} disabled={posting}>
                      {posting ? 'Posting…' : 'Post it'}
                    </button>
                    <button type='button' className='qs-show__cancel' onClick={() => setComposing(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type='button' className='qs-show__share-btn' onClick={() => setComposing(true)}>
                  Share this page as a Post in your name?
                </button>
              )}
            </div>
          )}
        </div>
        <Link to='/guide' className='qs-page__back'>← Back to How It Works</Link>
      </div>
    </Column>
  );
};

export default withIdentity(QuickShareShow);
