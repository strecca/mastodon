import { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import api from 'flavours/glitch/api';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';

const MemberStoriesList = ({ multiColumn }) => {
  const { signedIn } = useIdentity();
  const sc = useSiteContent();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasOwnStory, setHasOwnStory] = useState(null);

  useEffect(() => {
    api().get('/api/v1/civezza_member_stories')
      .then(res => setStories(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    // /me always 200s (find_or_initialize_by) -- id is only present once
    // the member has actually saved a story, whether published or still
    // a draft. That's what distinguishes "edit mine" from "start one".
    api().get('/api/v1/civezza_member_stories/me')
      .then(res => setHasOwnStory(!!res.data?.id))
      .catch(() => {});
  }, [signedIn]);

  return (
    <Column className='col-stories'>
      <ColumnHeader
        icon='book'
        iconComponent={GroupsIcon}
        title={sc('col_stories_title', 'Member Stories')}
        multiColumn={multiColumn}
        showBackButton
        className='ch-stories'
      />
      <Helmet><title>Member Stories · miacivezza</title></Helmet>

      <div className='ms-page'>
        <div className='ms-hero'>
          <Link to='/landing' className='ms-hero__back'>← Community Directory</Link>
          <GroupsIcon className='ms-hero__icon' />
          <h2 className='ms-hero__title'>Member Stories</h2>
          <p className='ms-hero__subtitle'>Personal histories · Civezza connections</p>
        </div>

        {!signedIn && (
          <a href='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#2C3E7A' }}>
            Log In or Join to write your own Member Story
          </a>
        )}

        <div className='ms-page__header'>
          <p className='ms-page__subtitle'>
            Stories from our Civezza community — personal histories, connections, and moments that matter.
          </p>
          {signedIn && hasOwnStory !== null && (
            <Link to='/member_stories/edit' className='button ms-page__edit-btn'>
              {hasOwnStory ? 'My Story' : '+ Add Your Own Story'}
            </Link>
          )}
        </div>

        {loading ? (
          <LoadingIndicator />
        ) : stories.length === 0 ? (
          <div className='ms-page__empty'>
            <p>No stories published yet. Be the first to share yours!</p>
            <Link to='/member_stories/edit' className='button'>Write My Story</Link>
          </div>
        ) : (
          <div className='ms-grid'>
            {stories.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}
      </div>
    </Column>
  );
};

const StoryCard = ({ story }) => {
  const { account, about_me, civezza_story, images } = story;
  const excerpt = about_me
    ? about_me.slice(0, 160) + (about_me.length > 160 ? '…' : '')
    : civezza_story
      ? civezza_story.slice(0, 160) + (civezza_story.length > 160 ? '…' : '')
      : null;

  return (
    <Link to={`/member_stories/${account?.id}`} className='ms-card'>
      {images?.[0] && (
        <div className='ms-card__photo'>
          <img src={images[0]} alt='' loading='lazy' />
        </div>
      )}
      <div className='ms-card__body'>
        <div className='ms-card__account'>
          {account?.avatar && (
            <img className='ms-card__avatar' src={account.avatar} alt={account.display_name} />
          )}
          <div className='ms-card__name'>
            <strong>{account?.display_name}</strong>
            <span className='ms-card__username'>@{account?.username}</span>
          </div>
        </div>
        {excerpt && <p className='ms-card__excerpt'>{excerpt}</p>}
        <span className='ms-card__cta'>Read their story →</span>
      </div>
    </Link>
  );
};

export default MemberStoriesList;
