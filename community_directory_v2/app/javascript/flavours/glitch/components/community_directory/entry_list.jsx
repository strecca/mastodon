// app/javascript/flavours/glitch/components/community_directory/entry_list.jsx
//
// Shared component used by every generated community feature's index page.
// Receives a config object (from config.json) and renders a searchable,
// filterable list of entries with cards. Public can browse; logged-in users
// see an "Add entry" button.

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';

import { useIntl, defineMessages } from 'react-intl';
import { Link } from 'react-router-dom';

import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { identityContextPropShape, withIdentity } from 'flavours/glitch/identity_context';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import { fetchEntries } from 'flavours/glitch/actions/community_entries';

import { EntryCard } from './entry_card';
import { SearchFilters } from './search_filters';

const messages = defineMessages({
  addEntry: { id: 'community.entry_list.add', defaultMessage: 'Add new entry' },
  noResults: { id: 'community.entry_list.empty', defaultMessage: 'No entries found.' },
  noResultsQuery: { id: 'community.entry_list.empty_query', defaultMessage: 'No entries match your search.' },
  beFirst: { id: 'community.entry_list.be_first', defaultMessage: 'Be the first to add an entry' },
});

const EntryListInner = ({ config, multiColumn, identity }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const debounceRef = useRef(null);

  const categoryKey = config.category_key;
  const apiEndpoint = config.api_endpoint;
  const featureKey = `community_${categoryKey}`;

  const catState = useAppSelector(state => state.community_entries.get(categoryKey));
  const entries = catState?.get('entries');
  const loading = catState?.get('entriesLoading') || false;
  const total = catState?.get('total') || 0;

  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({});

  const searchableFields = useMemo(
    () => config.fields.filter(f => f.searchable),
    [config.fields],
  );

  // Build the query string combining text search + filter values
  const buildSearchQuery = useCallback((textQuery, filters) => {
    const parts = [textQuery];
    Object.entries(filters).forEach(([, values]) => {
      if (Array.isArray(values)) {
        values.forEach(v => parts.push(v));
      }
    });
    return parts.filter(Boolean).join(' ');
  }, []);

  // Initial fetch
  useEffect(() => {
    dispatch(fetchEntries(categoryKey, apiEndpoint));
  }, [dispatch, categoryKey, apiEndpoint]);

  // Debounced search on query or filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const combinedQuery = buildSearchQuery(query, activeFilters);
      dispatch(fetchEntries(categoryKey, apiEndpoint, combinedQuery));
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dispatch, categoryKey, apiEndpoint, query, activeFilters, buildSearchQuery]);

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery);
  }, []);

  const handleFilterChange = useCallback((fieldName, values) => {
    setActiveFilters(prev => ({ ...prev, [fieldName]: values }));
  }, []);

  const { signedIn } = identity;
  const hasEntries = entries && entries.size > 0;
  const isInitialLoad = loading && !hasEntries;

  return (
    <div className='scrollable community-entry-list'>
      {/* Search + filters bar */}
      <SearchFilters
        query={query}
        onQueryChange={handleQueryChange}
        fields={searchableFields}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        disabled={isInitialLoad}
        categoryName={config.display_name}
      />

      {/* Add entry button for logged-in users */}
      {signedIn && (
        <div className='community-entry-list__add-bar'>
          <Link to={`/${featureKey}/new`} className='button'>
            {intl.formatMessage(messages.addEntry)}
          </Link>
        </div>
      )}

      {/* Results */}
      {isInitialLoad ? (
        <LoadingIndicator />
      ) : hasEntries ? (
        <div className='community-entry-list__entries'>
          {entries.map(entry => (
            <EntryCard
              key={entry.get('id')}
              entry={entry}
              config={config}
              featureKey={featureKey}
            />
          ))}
        </div>
      ) : (
        <div className='empty-column-indicator'>
          <p>{query ? intl.formatMessage(messages.noResultsQuery) : intl.formatMessage(messages.noResults)}</p>
          {signedIn && (
            <Link to={`/${featureKey}/new`} className='button'>
              {intl.formatMessage(messages.beFirst)}
            </Link>
          )}
        </div>
      )}

      {/* Total count */}
      {hasEntries && total > 0 && (
        <div className='community-entry-list__count'>
          {total} {total === 1 ? 'entry' : 'entries'}
        </div>
      )}
    </div>
  );
};

export const EntryList = withIdentity(EntryListInner);
