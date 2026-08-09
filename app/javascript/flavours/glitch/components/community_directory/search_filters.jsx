// app/javascript/flavours/glitch/components/community_directory/search_filters.jsx

import { useCallback } from 'react';

import { useIntl, defineMessages } from 'react-intl';

import { fieldLabel, optionLabel } from './translation_helpers';

const messages = defineMessages({
  searchPlaceholder: { id: 'community.search.placeholder',    defaultMessage: 'Search {name}…' },
  filtersLabel:      { id: 'community.search.filters',        defaultMessage: 'Filter:' },
  sortLabel:         { id: 'community.search.sort',           defaultMessage: 'Sort' },
  sortNewest:        { id: 'community.search.sort.newest',    defaultMessage: 'Newest' },
  sortOldest:        { id: 'community.search.sort.oldest',    defaultMessage: 'Oldest' },
  sortAz:            { id: 'community.search.sort.az',        defaultMessage: 'A–Z' },
  sortUpdated:       { id: 'community.search.sort.updated',   defaultMessage: 'Recently updated' },
});

const humanize = (str) => str ? str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

export const SearchFilters = ({ query, onQueryChange, sort, onSortChange, fields, activeFilters, onFilterChange, disabled, categoryName }) => {
  const intl = useIntl();

  const sortOptions = [
    { value: 'newest',  label: intl.formatMessage(messages.sortNewest) },
    { value: 'oldest',  label: intl.formatMessage(messages.sortOldest) },
    { value: 'az',      label: intl.formatMessage(messages.sortAz) },
    { value: 'updated', label: intl.formatMessage(messages.sortUpdated) },
  ];

  const handleSearchInput = useCallback((e) => {
    onQueryChange(e.target.value);
  }, [onQueryChange]);

  const handleSortChange = useCallback((e) => {
    onSortChange(e.target.value);
  }, [onSortChange]);

  const filterableFields = fields.filter(f =>
    f.options && f.options.length > 0 && ['select', 'checkboxes', 'radio'].includes(f.widget),
  );

  return (
    <div className='community-search-filters'>
      <div className='community-search-filters__search'>
        <input
          type='text'
          value={query}
          onChange={handleSearchInput}
          placeholder={intl.formatMessage(messages.searchPlaceholder, { name: categoryName })}
          className='community-search-filters__input'
          disabled={disabled}
          aria-label={intl.formatMessage(messages.searchPlaceholder, { name: categoryName })}
        />
        <select
          value={sort}
          onChange={handleSortChange}
          className='community-search-filters__sort'
          disabled={disabled}
          aria-label={intl.formatMessage(messages.sortLabel)}
        >
          {sortOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {filterableFields.length > 0 && (
        <div className='community-search-filters__groups'>
          {filterableFields.map(field => (
            <FilterPillGroup
              key={field.db_name}
              field={field}
              activeValues={activeFilters[field.db_name] || []}
              onChange={onFilterChange}
              intl={intl}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FilterPillGroup = ({ field, activeValues, onChange, intl }) => {
  const locale = intl.locale;
  const handleSelect = useCallback((option) => {
    const current = Array.isArray(activeValues) ? activeValues : [];
    const next = current.includes(option) ? [] : [option];
    onChange(field.db_name, next);
  }, [onChange, field.db_name, activeValues]);

  return (
    <div className='community-search-filters__group'>
      <span className='community-search-filters__group-label'>
        {fieldLabel(field, locale) || humanize(field.db_name)}
      </span>
      <div className='community-search-filters__pills'>
        {field.options.map(option => {
          const active = Array.isArray(activeValues) && activeValues.includes(option);
          return (
            <button
              key={option}
              type='button'
              className={`community-search-filters__pill${active ? ' community-search-filters__pill--active' : ''}`}
              onClick={() => handleSelect(option)}
              aria-pressed={active}
            >
              {optionLabel(field, option, locale)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
