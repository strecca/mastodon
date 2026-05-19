// app/javascript/flavours/glitch/components/community_directory/search_filters.jsx
//
// Renders a text search input and checkbox filters for each searchable field
// that has options (select, checkboxes, radio). For text-type searchable fields,
// the text search covers them automatically via the backend ILIKE query.

import { useCallback } from 'react';

import { useIntl, defineMessages } from 'react-intl';

const messages = defineMessages({
  searchPlaceholder: { id: 'community.search.placeholder', defaultMessage: 'Search {name}…' },
  filtersLabel: { id: 'community.search.filters', defaultMessage: 'Filter by:' },
});

const humanize = (str) => str ? str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

export const SearchFilters = ({ query, onQueryChange, fields, activeFilters, onFilterChange, disabled, categoryName }) => {
  const intl = useIntl();

  const handleSearchInput = useCallback((e) => {
    onQueryChange(e.target.value);
  }, [onQueryChange]);

  // Only show checkbox filters for fields with predefined options
  const filterableFields = fields.filter(f =>
    f.options && f.options.length > 0 && ['select', 'checkboxes', 'radio'].includes(f.widget),
  );

  return (
    <div className='community-search-filters'>
      {/* Text search */}
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
      </div>

      {/* Checkbox filters for option-based searchable fields */}
      {filterableFields.length > 0 && (
        <div className='community-search-filters__groups'>
          <span className='community-search-filters__label'>
            {intl.formatMessage(messages.filtersLabel)}
          </span>

          {filterableFields.map(field => (
            <FilterGroup
              key={field.db_name}
              field={field}
              activeValues={activeFilters[field.db_name] || []}
              onChange={onFilterChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FilterGroup = ({ field, activeValues, onChange }) => {
  const handleToggle = useCallback((option) => {
    const current = Array.isArray(activeValues) ? activeValues : [];
    const next = current.includes(option)
      ? current.filter(v => v !== option)
      : [...current, option];
    onChange(field.db_name, next);
  }, [onChange, field.db_name, activeValues]);

  return (
    <div className='community-search-filters__group'>
      <span className='community-search-filters__group-label'>
        {field.label || humanize(field.db_name)}:
      </span>

      <div className='community-search-filters__options'>
        {field.options.map(option => (
          <label key={option} className='community-search-filters__option'>
            <input
              type='checkbox'
              checked={Array.isArray(activeValues) && activeValues.includes(option)}
              onChange={() => handleToggle(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
