import { useCallback, useEffect, useRef } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { List as ImmutableList } from 'immutable';

import { Helmet } from '@unhead/react/helmet';

import PeopleIcon from '@/material-icons/400-24px/group.svg?react';
import {
  addColumn,
  removeColumn,
  moveColumn,
  changeColumnParams,
} from 'flavours/glitch/actions/columns';
import {
  fetchDirectory,
  expandDirectory,
} from 'flavours/glitch/actions/directory';
import { CategoryBannerLink } from 'flavours/glitch/components/community_directory/category_banner_link';
import { Column } from 'flavours/glitch/components/column';
import type { ColumnRef } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadMore } from 'flavours/glitch/components/load_more';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { ScrollContainer } from 'flavours/glitch/containers/scroll_container';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useSearchParam } from 'flavours/glitch/hooks/useSearchParam';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import { AccountCard } from './components/account_card';

const messages = defineMessages({
  title: { id: 'column.directory', defaultMessage: 'Browse profiles' },
  recentlyActive: {
    id: 'directory.recently_active',
    defaultMessage: 'Recently active',
  },
  newArrivals: { id: 'directory.new_arrivals', defaultMessage: 'New arrivals' },
  memberRequiredTitle: { id: 'alert.member_required.title', defaultMessage: 'Members Only' },
  memberRequiredMessage: {
    id: 'alert.member_required.message',
    defaultMessage: "To see this Community Information you must be a Subscribed Member. It's easy, quick and Free.",
  },
  memberRequiredAction: { id: 'alert.member_required.action', defaultMessage: 'Sign Up Free →' },
});

export const Directory: React.FC<{
  columnId?: string;
  multiColumn?: boolean;
  params?: { order: string };
}> = ({ columnId, multiColumn, params }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { signedIn } = useIdentity();

  const column = useRef<ColumnRef>(null);

  const [orderParam, setOrderParam] = useSearchParam('order');

  const order = orderParam ?? params?.order ?? 'active';

  const handlePin = useCallback(() => {
    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('DIRECTORY', { order }));
    }
  }, [dispatch, columnId, order]);

  const accountIds = useAppSelector(
    (state) =>
      state.user_lists.getIn(
        ['directory', 'items'],
        ImmutableList(),
      ) as ImmutableList<string>,
  );
  const isLoading = useAppSelector(
    (state) =>
      state.user_lists.getIn(['directory', 'isLoading'], true) as boolean,
  );
  const hasMore = useAppSelector(
    (state) => !!state.user_lists.getIn(['directory', 'next']),
  );

  useEffect(() => {
    void dispatch(fetchDirectory({ order }));
  }, [dispatch, order]);

  const handleMove = useCallback(
    (dir: number) => {
      dispatch(moveColumn(columnId, dir));
    },
    [dispatch, columnId],
  );

  const handleHeaderClick = useCallback(() => {
    column.current?.scrollTop();
  }, []);

  const handleChangeOrder = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const value = e.currentTarget.dataset.orderValue;
      if (!value) return;
      if (columnId) {
        dispatch(changeColumnParams(columnId, ['order'], value));
      } else {
        setOrderParam(value);
      }
    },
    [dispatch, columnId, setOrderParam],
  );

  const handleLoadMore = useCallback(() => {
    void dispatch(expandDirectory({ order }));
  }, [dispatch, order]);

  const pinned = !!columnId;
  const initialLoad = isLoading && accountIds.size === 0;

  const orderOptions = [
    { key: 'active', label: intl.formatMessage(messages.recentlyActive) },
    { key: 'new', label: intl.formatMessage(messages.newArrivals) },
  ];

  const scrollableArea = (
    <div className='scrollable'>
      <CategoryBannerLink variant='back' />

      {!signedIn && (
        <div className='directory__member-badge'>
          <strong className='directory__member-badge__title'>
            {intl.formatMessage(messages.memberRequiredTitle)}
          </strong>
          <p className='directory__member-badge__message'>
            {intl.formatMessage(messages.memberRequiredMessage)}
          </p>
          <a href='/join' className='directory__member-badge__action'>
            {intl.formatMessage(messages.memberRequiredAction)}
          </a>
        </div>
      )}

      <div className='cl-type-chips directory__order-chips' role='group'>
        {orderOptions.map((opt) => (
          <button
            key={opt.key}
            type='button'
            data-order-value={opt.key}
            className={`cl-type-chip${order === opt.key ? ' cl-type-chip--active' : ''}`}
            onClick={handleChangeOrder}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className='directory__list'>
        {initialLoad ? (
          <LoadingIndicator />
        ) : (
          accountIds.map((accountId) => (
            <AccountCard accountId={accountId} key={accountId} />
          ))
        )}
      </div>

      <LoadMore
        onClick={handleLoadMore}
        visible={!initialLoad && hasMore}
        loading={isLoading}
      />
    </div>
  );

  return (
    <Column
      bindToDocument={!multiColumn}
      ref={column}
      label={intl.formatMessage(messages.title)}
    >
      <ColumnHeader
        icon='address-book-o'
        iconComponent={PeopleIcon}
        title={intl.formatMessage(messages.title)}
        onPin={handlePin}
        onMove={handleMove}
        onClick={handleHeaderClick}
        pinned={pinned}
        multiColumn={multiColumn}
      />

      {multiColumn && !pinned ? (
        <ScrollContainer scrollKey='directory'>
          {scrollableArea}
        </ScrollContainer>
      ) : (
        scrollableArea
      )}

      <Helmet>
        <title>{intl.formatMessage(messages.title)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export -- Needed because this is called as an async components
export default Directory;
