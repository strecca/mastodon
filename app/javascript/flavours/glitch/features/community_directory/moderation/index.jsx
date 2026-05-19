// Moderation queue — admin and stewards approve or reject pending entries.

import { useEffect, useCallback } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import { fetchModeration, approveEntry, rejectEntry } from '../../../actions/community_directory';

const messages = defineMessages({
  title:   { id: 'community_directory.moderation.title',   defaultMessage: 'Moderation Queue' },
  empty:   { id: 'community_directory.moderation.empty',   defaultMessage: 'No entries pending review. All clear!' },
  approve: { id: 'community_directory.moderation.approve', defaultMessage: 'Approve' },
  reject:  { id: 'community_directory.moderation.reject',  defaultMessage: 'Reject' },
  back:    { id: 'community_directory.moderation.back',    defaultMessage: '← Back to Admin' },
  pending: { id: 'community_directory.moderation.pending', defaultMessage: '{count} pending' },
});

const CommunityDirectoryModeration = ({ multiColumn }) => {
  const intl  = useIntl();
  const dispatch = useAppDispatch();

  const queue   = useAppSelector(s => s.get('community_directory')?.get('moderation'));
  const loading = useAppSelector(s => s.get('community_directory')?.get('moderationLoading') || false);

  useEffect(() => { dispatch(fetchModeration()); }, [dispatch]);

  const handleApprove = useCallback((categoryKey, entryId) => {
    dispatch(approveEntry(categoryKey, entryId));
  }, [dispatch]);

  const handleReject = useCallback((categoryKey, entryId) => {
    if (window.confirm('Reject this entry? The submitter will not be notified.')) {
      dispatch(rejectEntry(categoryKey, entryId));
    }
  }, [dispatch]);

  const title = intl.formatMessage(messages.title);

  return (
    <Column bindToDocument={!multiColumn} label={title}>
      <ColumnHeader icon='shield' title={title} multiColumn={multiColumn} showBackButton />

      <div className='scrollable'>
        <div className='cd-moderation'>
          <div className='cd-moderation__nav'>
            <Link to='/community_directory' className='button button-secondary'>
              {intl.formatMessage(messages.back)}
            </Link>
            {queue && queue.size > 0 && (
              <span className='cd-moderation__count'>
                {intl.formatMessage(messages.pending, { count: queue.size })}
              </span>
            )}
          </div>

          {loading ? (
            <LoadingIndicator />
          ) : !queue || queue.size === 0 ? (
            <div className='empty-column-indicator'>
              {intl.formatMessage(messages.empty)}
            </div>
          ) : (
            <div className='cd-moderation__list'>
              {queue.map((item) => {
                const entryId     = item.get('id');
                const categoryKey = item.get('category_key');
                const categoryName = item.get('category_display_name') || categoryKey;
                const account     = item.get('account');
                const fields      = item.get('fields');
                const submittedAt = new Date(item.get('submitted_at')).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric',
                });

                return (
                  <div key={`${categoryKey}-${entryId}`} className='cd-moderation__item'>
                    <div className='cd-moderation__item-header'>
                      <span className='cd-moderation__category-badge'>{categoryName}</span>
                      <span className='cd-moderation__date'>{submittedAt}</span>
                    </div>

                    <div className='cd-moderation__item-body'>
                      {account && (
                        <div className='cd-moderation__account'>
                          <img
                            src={account.get('avatar')}
                            alt={account.get('username')}
                            className='cd-moderation__avatar'
                          />
                          <span className='cd-moderation__username'>@{account.get('username')}</span>
                          {account.get('display_name') && (
                            <span className='cd-moderation__display-name'>
                              {account.get('display_name')}
                            </span>
                          )}
                        </div>
                      )}

                      {fields && fields.size > 0 && (
                        <dl className='cd-moderation__fields'>
                          {fields.map((f, fi) => (
                            <div key={fi} className='cd-moderation__field'>
                              <dt>{f.get('label')}</dt>
                              <dd>{f.get('value') || <em>—</em>}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>

                    <div className='cd-moderation__actions'>
                      <button
                        type='button'
                        className='button'
                        onClick={() => handleApprove(categoryKey, entryId)}
                      >
                        {intl.formatMessage(messages.approve)}
                      </button>
                      <button
                        type='button'
                        className='button button--destructive'
                        onClick={() => handleReject(categoryKey, entryId)}
                      >
                        {intl.formatMessage(messages.reject)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Helmet>
        <title>{title}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

export default CommunityDirectoryModeration;
