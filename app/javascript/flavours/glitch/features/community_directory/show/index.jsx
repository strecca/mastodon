// app/javascript/flavours/glitch/features/community_directory/show/index.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchResource } from '../../../actions/community_directory';
import ResourceCard from '../components/resource_card';
import { Link } from 'react-router-dom';

const CommunityDirectoryShow = ({ match }) => {
  const { category, id } = match.params || {};
  const dispatch = useDispatch();

  const resource = useSelector(state => state.getIn(['community_directory', 'currentResource']));
  const loading = useSelector(state => state.getIn(['community_directory', 'loading'], false));
  const error = useSelector(state => state.getIn(['community_directory', 'error']));

  useEffect(() => {
    if (category && id) {
      dispatch(fetchResource(category, id));
    }
  }, [dispatch, category, id]);

  if (error) {
    return (
      <div className="status error">
        <h2>Error Loading Details</h2>
        <p>{error}</p>
        <Link to={`/directories/${category}`} className="btn btn-link">
          ← Back to {category?.humanize?.() || category} Directory
        </Link>
      </div>
    );
  }

  if (loading || !resource) {
    return <div className="loading-bar">Loading full details...</div>;
  }

  const metadata = resource.get('metadata') || [];

  return (
    <div className="community-show">
      <div className="mb-4">
        <Link to={`/directories/${category}`} className="btn btn-link">
          ← Back to Directory
        </Link>
      </div>

      <h1>{resource.get('display_name') || 'Entry Details'}</h1>

      {/* Summary Card */}
      <ResourceCard resource={resource} category={category} />

      {/* Full Details */}
      <div className="status mt-4">
        <h3>Full Information</h3>
        <div className="status__content">
          {metadata.length > 0 ? (
            metadata.map((field, index) => {
              try {
                const fieldName = field.get('db_name');
                const label = field.get('label') || fieldName;
                const value = resource.get(fieldName);

                if (value == null || value === '') return null;

                const displayValue = Array.isArray(value) 
                  ? value.join(', ') 
                  : String(value);

                return (
                  <div key={index} className="field mb-4">
                    <strong>{label}:</strong>
                    <p className="mb-0 mt-1">{displayValue}</p>
                  </div>
                );
              } catch (e) {
                console.warn(`Error rendering field:`, e);
                return null;
              }
            })
          ) : (
            <p className="text-muted">No additional information available.</p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <Link 
          to={`/directories/${category}/${id}/edit`} 
          className="btn btn-primary"
        >
          ✏️ Edit This Entry
        </Link>
      </div>
    </div>
  );
};

export default CommunityDirectoryShow;