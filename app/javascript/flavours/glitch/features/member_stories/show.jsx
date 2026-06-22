import { useState, useEffect } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import api from 'flavours/glitch/api';
import { withIdentity } from 'flavours/glitch/identity_context';

const PROMPTS = {
  about_me:       'About Me',
  civezza_story:  'My Connection to Civezza',
  shaping_moment: 'A Moment That Shaped Me',
  why_i_joined:   'Why I Joined MiaCivezza.com',
};

const MemberStoriesShow = ({ multiColumn, signedIn, params }) => {
  const accountId = params?.account_id;
  const [story, setStory]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const history = useHistory();

  useEffect(() => {
    if (!accountId) return;
    api().get(`/api/v1/civezza_member_stories/${accountId}`)
      .then(res => setStory(res.data))
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) {
    return (
      <Column>
        <ColumnHeader icon='book' title='Member Story' multiColumn={multiColumn} />
        <LoadingIndicator />
      </Column>
    );
  }

  if (notFound || !story) {
    return (
      <Column>
        <ColumnHeader icon='book' title='Member Story' multiColumn={multiColumn} />
        <div className='ms-page ms-page--not-found'>
          <p>This story isn&apos;t available.</p>
          <Link to='/member_stories' className='button'>← All Stories</Link>
        </div>
      </Column>
    );
  }

  const { account, images, is_own } = story;
  const hasAnyText = Object.keys(PROMPTS).some(k => story[k]);

  return (
    <Column>
      <ColumnHeader icon='book' title='Member Story' multiColumn={multiColumn} />
      <Helmet><title>{account?.display_name} · Member Story · miacivezza</title></Helmet>

      <div className='ms-page ms-story'>
        <Link to='/member_stories' className='ms-story__back'>← All Stories</Link>

        {/* ── Profile header ── */}
        <div className='ms-story__header'>
          {account?.avatar && (
            <img className='ms-story__avatar' src={account.avatar} alt={account.display_name} />
          )}
          <div>
            <h1 className='ms-story__name'>{account?.display_name}</h1>
            <span className='ms-story__username'>@{account?.username}</span>
          </div>
          {is_own && (
            <Link to='/member_stories/edit' className='button button-secondary ms-story__edit-link'>
              Edit My Story
            </Link>
          )}
        </div>

        {/* ── Photo gallery ── */}
        {images?.length > 0 && (
          <div className={`ms-story__photos ms-story__photos--${images.length}`}>
            {images.map((src, i) => (
              <a key={i} href={src} target='_blank' rel='noopener noreferrer' className='ms-story__photo-wrap'>
                <img src={src} alt='' loading='lazy' />
              </a>
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
                  <p className='ms-story__section-body'>{story[key]}</p>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <p className='ms-story__empty'>This member hasn&apos;t written their story yet.</p>
        )}
      </div>
    </Column>
  );
};

export default withIdentity(MemberStoriesShow);
