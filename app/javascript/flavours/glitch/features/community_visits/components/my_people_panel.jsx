// my_people_panel.jsx — manage the current user's My People group

import { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';
import { useIdentity } from 'flavours/glitch/identity_context';
import {
  fetchMyPeople, addMyPerson, removeMyPerson, fetchMyFollowers,
} from 'flavours/glitch/actions/community_visits';
import AddIcon   from '@/material-icons/400-24px/add.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import GroupIcon from '@/material-icons/400-24px/group.svg?react';

export const MyPeoplePanel = () => {
  const dispatch    = useAppDispatch();
  const { accountId } = useIdentity();

  const myPeople    = useAppSelector(s => s.getIn(['community_visits', 'myPeople']));
  const myFollowers = useAppSelector(s => s.getIn(['community_visits', 'myFollowers']));

  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    dispatch(fetchMyPeople());
  }, [dispatch]);

  useEffect(() => {
    if (showAdd && accountId) dispatch(fetchMyFollowers(accountId));
  }, [showAdd, accountId, dispatch]);

  // Set of member account IDs already in My People (strings)
  const myPeopleIds = useMemo(
    () => new Set(myPeople.map(p => p.getIn(['account', 'id'])).toArray()),
    [myPeople]
  );

  // Followers not yet in the group
  const availableFollowers = useMemo(
    () => myFollowers.filter(f => !myPeopleIds.has(f.get('id'))),
    [myFollowers, myPeopleIds]
  );

  const handleAdd = (followerId) => {
    dispatch(addMyPerson(followerId));
  };

  const handleRemove = (personId) => {
    dispatch(removeMyPerson(personId));
  };

  return (
    <div className='cv-my-people'>
      <div className='cv-my-people__header'>
        <h3 className='cv-my-people__title'>
          <GroupIcon className='cv-my-people__title-icon' />
          My People
          {myPeople.size > 0 && (
            <span className='cv-my-people__count'>{myPeople.size}</span>
          )}
        </h3>
        <button
          type='button'
          className='button button--compact'
          onClick={() => setShowAdd(s => !s)}
        >
          <AddIcon /> {showAdd ? 'Done' : 'Add'}
        </button>
      </div>

      <p className='cv-my-people__desc'>
        A private group you curate. Add followers here, then choose "My People" visibility when posting a visit — only they'll see it.
      </p>

      {myPeople.size === 0 && !showAdd ? (
        <p className='cv-my-people__empty'>
          No one added yet. Click Add to pick people from your followers.
        </p>
      ) : (
        <div className='cv-my-people__list'>
          {myPeople.map(person => {
            const acct = person.get('account');
            return (
              <div key={person.get('id')} className='cv-my-people__member'>
                <img
                  className='cv-my-people__avatar'
                  src={acct.get('avatar')}
                  alt={acct.get('username')}
                />
                <span className='cv-my-people__name'>
                  {acct.get('display_name') || `@${acct.get('username')}`}
                </span>
                <button
                  type='button'
                  className='cv-icon-btn cv-icon-btn--danger cv-my-people__remove'
                  title={`Remove ${acct.get('display_name') || acct.get('username')}`}
                  onClick={() => handleRemove(person.get('id'))}
                >
                  <CloseIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className='cv-my-people__add-panel'>
          <h4 className='cv-my-people__add-title'>Add from your followers</h4>
          {availableFollowers.size === 0 ? (
            <p className='cv-my-people__add-empty'>
              {myFollowers.size === 0
                ? 'Loading followers…'
                : 'Everyone who follows you is already in your group.'}
            </p>
          ) : (
            <div className='cv-my-people__add-list'>
              {availableFollowers.map(follower => (
                <div key={follower.get('id')} className='cv-my-people__add-row'>
                  <img
                    className='cv-my-people__avatar'
                    src={follower.get('avatar')}
                    alt={follower.get('username')}
                  />
                  <span className='cv-my-people__name'>
                    {follower.get('display_name') || `@${follower.get('username')}`}
                  </span>
                  <button
                    type='button'
                    className='button button--compact cv-my-people__add-btn'
                    onClick={() => handleAdd(follower.get('id'))}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
