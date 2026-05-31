import { useState, useEffect, useCallback } from 'react';

import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import TagIcon from '@/material-icons/400-24px/tag.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { withIdentity } from 'flavours/glitch/identity_context';
import api from 'flavours/glitch/api';

import { ListingCard } from './components/listing_card';

const TYPES = [
  { key: '',         label: 'All' },
  { key: 'giveaway', label: 'Giveaway' },
  { key: 'trade',    label: 'Trade' },
  { key: 'sell',     label: 'Sell' },
  { key: 'rent',     label: 'Rent' },
  { key: 'iso',      label: 'ISO' },
];

const CommunityListings = ({ identity, multiColumn }) => {
  const [listings,    setListings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [typeFilter,  setTypeFilter]  = useState('');
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');

  const signedIn = identity?.signedIn;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.listing_type = typeFilter;
      if (search)     params.q            = search;
      const res = await api().get('/api/v1/community_listings', { params });
      setListings(res.data);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setSearch(searchInput);
  }, [searchInput]);

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

        {loading && <LoadingIndicator />}

        {!loading && listings.length === 0 && (
          <div className='cl-empty'>No listings found.</div>
        )}

        {!loading && listings.length > 0 && (
          <div className='cl-grid'>
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </Column>
  );
};

export default withIdentity(CommunityListings);
