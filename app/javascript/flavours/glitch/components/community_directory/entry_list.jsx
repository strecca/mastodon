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
  const [sort, setSort] = useState('newest');
  const isFirstRender = useRef(true);

  const searchableFields = useMemo(
    () => config.fields.filter(f => f.searchable),
    [config.fields],
  );

  // Client-side filter: apply option filters to already-fetched entries.
  // Text search is handled server-side via ILIKE; JSONB/option fields are filtered here.
  const filteredEntries = useMemo(() => {
    if (!entries) return entries;
    const hasFilters = Object.values(activeFilters).some(v => Array.isArray(v) && v.length > 0);
    if (!hasFilters) return entries;

    return entries.filter(entry => {
      return Object.entries(activeFilters).every(([fieldName, values]) => {
        if (!Array.isArray(values) || values.length === 0) return true;
        const entryVal = entry.get(fieldName);
        // ImmutableList (JSONB checkboxes field)
        if (entryVal && typeof entryVal.includes === 'function') {
          return values.some(v => entryVal.includes(v));
        }
        // Plain string (select / radio)
        return values.some(v => entryVal === v);
      });
    });
  }, [entries, activeFilters]);

  // Single effect handles initial load, query changes (debounced), and sort changes.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const delay = isFirstRender.current ? 0 : 350;
    isFirstRender.current = false;

    debounceRef.current = setTimeout(() => {
      dispatch(fetchEntries(categoryKey, apiEndpoint, query, 1, sort));
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dispatch, categoryKey, apiEndpoint, query, sort]);

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery);
  }, []);

  const handleSortChange = useCallback((newSort) => {
    setSort(newSort);
  }, []);

  const handleFilterChange = useCallback((fieldName, values) => {
    setActiveFilters(prev => ({ ...prev, [fieldName]: values }));
  }, []);

  const { signedIn } = identity;
  const hasEntries = filteredEntries && filteredEntries.size > 0;
  const isInitialLoad = loading && !(entries && entries.size > 0);

  return (
    <div className='scrollable community-entry-list'>
      {/* Persistent all-categories banner */}
      <Link to='/community' className='community-category-banner'>
        🎨 Click here to See All Community Categories 🎨
      </Link>

      {/* Search + filters bar */}
      <SearchFilters
        query={query}
        onQueryChange={handleQueryChange}
        sort={sort}
        onSortChange={handleSortChange}
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
          {filteredEntries.map(entry => (
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
