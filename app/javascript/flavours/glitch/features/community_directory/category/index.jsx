// app/javascript/flavours/glitch/features/community_directory/category/index.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchResources } from '../../../actions/community_directory';
import ResourceCard from '../components/resource_card';
import { Link } from 'react-router-dom';

const CommunityDirectoryCategory = ({ match }) => {
  const { category } = match.params || {};
  const dispatch = useDispatch();

  const resources = useSelector(state => state.getIn(['community_directory', 'resources'], []));
  const formConfig = useSelector(state => state.getIn(['community_directory', 'formConfig'], {}));
  const loading = useSelector(state => state.getIn(['community_directory', 'loading'], false));
  const error = useSelector(state => state.getIn(['community_directory', 'error']));

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});

  const debounceRef = React.useRef(null);

  const performSearch = useCallback((searchQuery) => {
    if (!category) return;
    dispatch(fetchResources(category, searchQuery));
  }, [dispatch, category]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const handleSearchChange = (e) => setQuery(e.target.value);

  const searchableFields = formConfig.get('fields')?.filter(f => f.get('searchable')) || [];

  if (error) {
    return <div className="status error">Error loading {category}: {error}</div>;
  }

  if (!category) {
    return <div className="status error">Category not specified.</div>;
  }

  return (
    <div className="community-directory-category">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{category.humanize?.() || category}</h1>
        <Link to={`/directories/${category}/new`} className="btn btn-primary">
          + Add New Entry
        </Link>
      </div>

      <p className="lead mb-4">Community directory for {category}</p>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={`Search ${category}...`}
          value={query}
          onChange={handleSearchChange}
          className="search__input w-100"
          disabled={loading}
        />
      </div>

      {/* Filters */}
      {searchableFields.length > 0 && (
        <div className="filters mb-4 p-3 border rounded">
          <h5 className="mb-3">Filters</h5>
          {/* ... your existing filter code ... */}
        </div>
      )}

      {loading && <div className="loading-bar">Loading...</div>}

      {!loading && (
        <div className="status-list">
          {resources.size > 0 ? (
            resources.map(resource => (
              <ResourceCard 
                key={resource.get('id')} 
                resource={resource} 
                category={category} 
              />
            ))
          ) : (
            <div className="status">
              <p>No entries found yet.</p>
              <Link to={`/directories/${category}/new`} className="btn btn-primary mt-3">
                Be the first to add an entry →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityDirectoryCategory;