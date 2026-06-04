import { useState, useEffect, useCallback, useMemo } from 'react';

import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import TagIcon from '@/material-icons/400-24px/tag.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';
import { fetchListings } from 'flavours/glitch/actions/community_listings';

import { ListingCard } from './components/listing_card';

const TYPES = [
  { key: '',         label: 'All' },
  { key: 'giveaway', label: 'Giveaway' },
  { key: 'trade',    label: 'Trade' },
  { key: 'sell',     label: 'Sell' },
  { key: 'rent',     label: 'Rent' },
  { key: 'iso',      label: 'ISO' },
];

const CommunityListings = ({ multiColumn }) => {
  const dispatch   = useAppDispatch();
  const { signedIn } = useIdentity();

  const listings = useAppSelector(s => s.getIn(['community_listings', 'items']));
  const loading  = useAppSelector(s => s.getIn(['community_listings', 'loading']));
  const loaded   = useAppSelector(s => s.getIn(['community_listings', 'loaded']));

  const [typeFilter,  setTypeFilter]  = useState('');
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    dispatch(fetchListings());
  }, [dispatch]);

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
    <Column>
      <ColumnHeader
        icon='tag'
        iconComponent={TagIcon}
        title='Community Listings'
        multiColumn={multiColumn}
      />
      <Helmet><title>Community Listings · miacivezza</title></Helmet>

      <div className='cl-page'>
        <div className='cl-hero'>
          <div className='cl-hero__title'>Exchange &amp; Find</div>
          <div className='cl-hero__subtitle'>Giveaway · Trade · Sell · Rent · In Search Of</div>
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
              placeholder='Search listings…'
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type='submit' className='cl-search__btn'>Search</button>
            {search && (
              <button type='button' className='cl-search__clear'
                onClick={() => { setSearch(''); setSearchInput(''); }}>
                Clear
              </button>
            )}
          </form>
        </div>

        {signedIn && (
          <div className='cl-new-btn-row'>
            <Link to='/community_listings/new' className='button'>
              + Post a Listing
            </Link>
          </div>
        )}

        {loading && !loaded && <LoadingIndicator />}

        {loaded && visibleListings.size === 0 && (
          <div className='cl-empty'>No listings found.</div>
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
