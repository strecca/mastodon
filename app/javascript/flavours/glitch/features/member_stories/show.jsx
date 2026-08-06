import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { Link } from 'react-router-dom';

import { useIntl } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';

import { useViewingLocale } from 'flavours/glitch/hooks/useViewingLocale';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useIdentity } from 'flavours/glitch/identity_context';
import api from 'flavours/glitch/api';

const PROMPTS = {
  about_me:       'About Me',
  civezza_story:  'My Connection to Civezza',
  shaping_moment: 'A Moment That Shaped Me',
  why_i_joined:   'Why I Joined MiaCivezza.com',
};

// ── Lightbox ────────────────────────────────────────────────────────────────

const Lightbox = ({ images, index, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose, onPrev, onNext]);

  return (
    <div className='ms-lightbox' onClick={onClose} role='dialog' aria-modal='true'>
      <button className='ms-lightbox__close' onClick={onClose} aria-label='Close photo viewer'>✕</button>

      <div className='ms-lightbox__content' onClick={e => e.stopPropagation()}>
        <img
          className='ms-lightbox__image'
          src={images[index]}
          alt={`Photo ${index + 1} of ${images.length}`}
        />

        {images.length > 1 && (
          <>
            <button
              className='ms-lightbox__prev'
              onClick={onPrev}
              disabled={index === 0}
              aria-label='Previous photo'
            >
              ‹
            </button>
            <button
              className='ms-lightbox__next'
              onClick={onNext}
              disabled={index === images.length - 1}
              aria-label='Next photo'
            >
              ›
            </button>
            <span className='ms-lightbox__counter'>{index + 1} / {images.length}</span>
          </>
        )}
      </div>

      <p className='ms-lightbox__hint'>Click outside or press Esc to return to the story</p>
    </div>
  );
};

// ── Story page ───────────────────────────────────────────────────────────────

const MemberStoriesShow = ({ multiColumn, params }) => {
  const accountId = params?.account_id;
  const intl = useIntl();
  const { viewingLocale } = useViewingLocale();
  const activeLocale = (viewingLocale || intl.locale || 'en').split('-')[0];
  const { signedIn } = useIdentity();

  const [story, setStory]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState(null); // null = closed, 0/1/2 = open
  const [hasOwnStory, setHasOwnStory] = useState(null);

  useEffect(() => {
    if (!accountId) return;
    api().get(`/api/v1/civezza_member_stories/${accountId}`)
      .then(res => setStory(res.data))
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [accountId]);

  useEffect(() => {
    if (!signedIn) return;
    // Same check as the index page: distinguishes "you have a story to
    // edit" from "you haven't written one yet" for a viewer looking at
    // someone else's page -- previously there was no invitation at all
    // here for that case, only an "Edit My Story" link gated to is_own.
    api().get('/api/v1/civezza_member_stories/me')
      .then(res => setHasOwnStory(!!res.data?.id))
      .catch(() => {});
  }, [signedIn]);

  const openLightbox  = useCallback((i) => setLightbox(i), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const prevPhoto     = useCallback(() => setLightbox(i => Math.max(0, i - 1)), []);
  const nextPhoto     = useCallback((max) => () => setLightbox(i => Math.min(max - 1, i + 1)), []);

  if (loading) {
    return (
      <Column className='col-stories'>
        <ColumnHeader icon='book' title='Member Story' multiColumn={multiColumn} showBackButton className='ch-stories' />
        <LoadingIndicator />
      </Column>
    );
  }

  if (notFound || !story) {
    return (
      <Column className='col-stories'>
        <ColumnHeader icon='book' title='Member Story' multiColumn={multiColumn} showBackButton className='ch-stories' />
        <div className='ms-page ms-page--not-found'>
          <p>This story isn&apos;t available.</p>
          <Link to='/member_stories' className='button'>← All Stories</Link>
        </div>
      </Column>
    );
  }

  const { account, images, is_own } = story;
  const tr = (field) => {
    const ts = story.translations || {};
    return ts[activeLocale]?.[field] || ts[activeLocale.split('-')[0]]?.[field] || story[field];
  };
  const hasAnyText = Object.keys(PROMPTS).some(k => story[k]);
  const imageCount = images?.length ?? 0;

  return (
    <Column>
      <ColumnHeader icon='book' title='Member Story' multiColumn={multiColumn} />
      <Helmet><title>{account?.display_name} · Member Story · miacivezza</title></Helmet>

      <div className='ms-page ms-story'>
        <div className='ms-hero'>
          <Link to='/landing' className='ms-hero__back'>← Community Directory</Link>
          <h2 className='ms-hero__title'>Member Stories</h2>
          <p className='ms-hero__subtitle'>Personal histories · Civezza connections</p>
        </div>

        <Link to='/member_stories' className='ms-story__back'>← All Stories</Link>

        {!signedIn && (
          <a href='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#2C3E7A' }}>
            Log In or Join to write your own Member Story
          </a>
        )}

        {/* ── Profile header ── */}
        <div className='ms-story__header'>
          {account?.avatar && (
            <img className='ms-story__avatar' src={account.avatar} alt={account.display_name} />
          )}
          <div>
            <h1 className='ms-story__name'>{account?.display_name}</h1>
            <span className='ms-story__username'>@{account?.username}</span>
          </div>
          {is_own ? (
            <Link to='/member_stories/edit' className='button button-secondary ms-story__edit-link'>
              Edit My Story
            </Link>
          ) : signedIn && hasOwnStory === false && (
            <Link to='/member_stories/edit' className='button ms-story__edit-link'>
              + Add Your Own Story
            </Link>
          )}
        </div>

        {/* ── Photo gallery — click opens lightbox ── */}
        {imageCount > 0 && (
          <div className={`ms-story__photos ms-story__photos--${imageCount}`}>
            {images.map((src, i) => (
              <button
                key={i}
                type='button'
                className='ms-story__photo-wrap'
                onClick={() => openLightbox(i)}
                aria-label={`View photo ${i + 1}`}
              >
                <img src={src} alt='' loading='lazy' />
                <span className='ms-story__photo-zoom'>⤢</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Story sections ── */}
        {hasAnyText ? (
          <div className='ms-story__sections'>
            {Object.entries(PROMPTS).map(([key, label]) =>
              story[key] ? (
                <div key={key} className='ms-story__section'>
                  <h2 className='ms-story__section-title'>{label}</h2>
                  <p className='ms-story__section-body'>{tr(key)}</p>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <p className='ms-story__empty'>This member hasn&apos;t written their story yet.</p>
        )}

        {/* ── Bottom nav ── */}
        <div className='ms-story__footer'>
          <Link to='/member_stories' className='ms-story__back'>← All Stories</Link>
          {is_own ? (
            <Link to='/member_stories/edit' className='button button-secondary'>
              Edit My Story
            </Link>
          ) : signedIn && hasOwnStory === false && (
            <Link to='/member_stories/edit' className='button'>
              + Add Your Own Story
            </Link>
          )}
        </div>
      </div>

      {/* ── Lightbox overlay — portal to body so fixed positioning is viewport-relative ── */}
      {lightbox !== null && imageCount > 0 && createPortal(
        <Lightbox
          images={images}
          index={lightbox}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto(imageCount)}
        />,
        document.body,
      )}
    </Column>
  );
};

export default MemberStoriesShow;
