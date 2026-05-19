// app/javascript/flavours/glitch/features/community_directory/index/index.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as AsyncComponents from '../../ui/util/async-components.js';
import { fetchCategories } from '../../../actions/community_directory';
//import Icon from 'mastodon/components/icon';

const CommunityDirectoryIndex = () => {
  const dispatch = useDispatch();
  const categories = useSelector(state => state.getIn(['community_directory', 'categories'], []));
  const loading = useSelector(state => state.getIn(['community_directory', 'loading'], false));
  const error = useSelector(state => state.getIn(['community_directory', 'error']));

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  if (error) {
    return <div className="status error">Failed to load directories: {error}</div>;
  }

  if (loading) {
    return <div className="loading-bar">Loading community directories...</div>;
  }

  if (categories.size === 0) {
    return (
      <div className="status">
        <h1>Community Directory</h1>
        <p className="text-muted">No community categories have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="community-directory">
      <h1>Community Directory</h1>
      <p className="lead">Discover local community resources and connect with your neighbors.</p>

      <div className="directory-grid">
        {categories.map(cat => (
          <a
            key={cat.get('name')}
            href={`/directories/${cat.get('name')}`}
            className="directory-card status"
          >
            <div className="status__content text-center">
              <Icon
                id={cat.get('icon')?.replace(/^fa-/, '') || 'users'}
                className="fa-3x text-primary mb-3"
              />
              <h3>{cat.get('humanized')}</h3>
              <p className="text-muted">Browse {cat.get('name').toLowerCase()}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default CommunityDirectoryIndex;