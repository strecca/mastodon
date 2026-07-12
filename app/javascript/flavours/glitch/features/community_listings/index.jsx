import { useState, useEffect, useCallback, useMemo } from 'react';

import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import TagIcon from '@/material-icons/400-24px/tag.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';
import { CategoryBannerLink } from 'flavours/glitch/components/community_directory/category_banner_link';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';
import { fetchListings } from 'flavours/glitch/actions/community_listings';
import { connectStream } from 'flavours/glitch/stream';

import { ListingCard } from './components/listing_card';

const CommunityListings = ({ multiColumn }) => {
  const dispatch   = useAppDispatch();
  const { signedIn } = useIdentity();
  const sc = useSiteContent();

  const TYPES = [
    { key: '',         label: sc('listings_filter_all',      'All') },
    { key: 'giveaway', label: sc('listings_filter_giveaway', 'Giveaway') },
    { key: 'trade',    label: sc('listings_filter_trade',    'Trade') },
    { key: 'sell',     label: sc('listings_filter_sell',     'Sell') },
    { key: 'rent',     label: sc('listings_filter_rent',     'Rent') },
    { key: 'iso',      label: sc('listings_filter_iso',      'ISO') },
  ];

  const listings = useAppSelector(s => s.getIn(['community_listings', 'items']));
  const loading  = useAppSelector(s => s.getIn(['community_listings', 'loading']));
  const loaded   = useAppSelector(s => s.getIn(['community_listings', 'loaded']));

  const [typeFilter,  setTypeFilter]  = useState('');
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    dispatch(fetchListings());
  }, [dispatch]);

  useEffect(() => {
    if (!signedIn) return;
    const disconnect = dispatch(connectStream('community:listings', {}, (innerDispatch) => ({
      onConnect() {},
      onDisconnect() {},
      onReceive(data) {
        if (data.event === 'refresh') innerDispatch(fetchListings());
      },
    })));
    return disconnect;
  }, [dispatch, signedIn]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setSearch(searchInput);
  }, [searchInput]);

  // Filter client-side — no extra API calls when switching type or searching
  const visibleListings = useMemo(() => {
    let result = listings;
    if (typeFilter) result = result.filter(l => l.get('listing_type') === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.get('title') ?? '').toLowerCase().includes(q) ||
        (l.get('description') ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [listings, typeFilter, search]);

  return (
    <Column className='col-listings'>
      <ColumnHeader
        icon='tag'
        iconComponent={TagIcon}
        title={sc('col_listings_title', 'Community Listings')}
        multiColumn={multiColumn}
        showBackButton
        className='ch-listings'
      />
      <Helmet><title>Community Listings · miacivezza</title></Helmet>

      <CategoryBannerLink variant='back' />
      {!signedIn && (
        <a href='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#5A7A1A' }}>
          {sc('listings_join_cta', 'Log In or Join to add your own Community Listings')}
        </a>
      )}

      <div className='cl-page'>
        <div className='cl-hero'>
          <div className='cl-hero__title'>{sc('listings_hero_title', 'Exchange & Find')}</div>
          <div className='cl-hero__subtitle'>{sc('listings_hero_subtitle', 'Giveaway · Trade · Sell · Rent · In Search Of')}</div>
        </div>

        <div className='cl-toolbar'>
          <div className='cl-type-chips'>
            {TYPES.map(t => (
              <button
                key={t.key}
                className={`cl-type-chip${typeFilter === t.key ? ' cl-type-chip--active' : ''}`}
                onClick={() => setTypeFilter(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form className='cl-search' onSubmit={handleSearch}>
            <input
              className='cl-search__input'
              type='text'
              placeholder={sc('listings_search_placeholder', 'Search listings…')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type='submit' className='cl-search__btn'>{sc('listings_search_btn', 'Search')}</button>
            {search && (
              <button type='button' className='cl-search__clear'
                onClick={() => { setSearch(''); setSearchInput(''); }}>
                {sc('listings_search_clear', 'Clear')}
              </button>
            )}
          </form>
        </div>

        {signedIn && (
          <div className='cl-new-btn-row'>
            <Link to='/community_listings/new' className='button'>
              {sc('listings_post_btn', '+ Post a Listing')}
            </Link>
          </div>
        )}

        {loading && !loaded && <LoadingIndicator />}

        {loaded && visibleListings.size === 0 && (
          <div className='cl-empty'>{sc('listings_empty', 'No listings found.')}</div>
        )}

        {loaded && visibleListings.size > 0 && (
          <div className='cl-grid'>
            {visibleListings.map(listing => (
              <ListingCard key={listing.get('id')} listing={listing.toJS()} />
            ))}
          </div>
        )}
      </div>
    </Column>
  );
};

export default CommunityListings;
