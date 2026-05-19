// app/javascript/flavours/glitch/features/community_directory/components/resource_card.jsx
import React from 'react';
import { Link } from 'react-router-dom';
//import Avatar from 'glitch/components/avatar';

function ResourceCard({ resource, category }) {
  if (!resource) {
    return <div className="status">Error loading resource</div>;
  }

  const account = resource.get('account') || {};
  const metadata = resource.get('metadata') || [];
  const displayName = resource.get('display_name') ||
    account.get('display_name') ||
    `@${account.get('username') || 'unknown'}`;

  // Safe preview fields
  const previewFields = metadata.slice(0, 4);

  return (
    <div className="status resource-card">
      <div className="status__info">
        <Avatar account={account} size={46} />
        <div className="status__meta">
          <strong className="status__display-name">{displayName}</strong>
          <small className="text-muted">@{account.get('username') || 'unknown'}</small>
        </div>
      </div>

      <div className="status__content">
        {previewFields.map((field, i) => {
          try {
            const value = resource.get(field.get('db_name'));
            if (value == null || value === '') return null;

            const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

            return (
              <p key={i} className="mb-1">
                <strong>{field.get('label') || 'Field'}:</strong> {displayValue}
              </p>
            );
          } catch (e) {
            console.warn('Error rendering field in card:', e);
            return null;
          }
        })}
      </div>

      <div className="status__action-bar text-muted small">
        <FormattedRelative value={resource.get('created_at')} />
        <Link
          to={`/directories/${category}/${resource.get('id')}`}
          className="btn btn-link ms-2"
        >
          View full details →
        </Link>
      </div>
    </div>
  );
}

export default ResourceCard;