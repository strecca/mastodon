// Admin UI for managing community locations (towns).
// Accessible at /community_directory/locations — admin only.

import { useState, useEffect, useCallback } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import PlaceIcon from '@/material-icons/400-24px/place.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';

import api from 'flavours/glitch/api';

const messages = defineMessages({
  title:       { id: 'community_directory.locations.title',   defaultMessage: 'Manage Towns' },
  back:        { id: 'community_directory.locations.back',    defaultMessage: '← Back to Admin' },
  namePlaceholder: { id: 'community_directory.locations.name_ph', defaultMessage: 'Town name…' },
  add:         { id: 'community_directory.locations.add',     defaultMessage: 'Add town' },
  empty:       { id: 'community_directory.locations.empty',   defaultMessage: 'No towns yet.' },
  active:      { id: 'community_directory.locations.active',  defaultMessage: 'Active' },
  inactive:    { id: 'community_directory.locations.inactive', defaultMessage: 'Hidden' },
  remove:      { id: 'community_directory.locations.remove',  defaultMessage: 'Remove' },
  sortOrder:   { id: 'community_directory.locations.sort',    defaultMessage: 'Sort' },
});

const CommunityDirectoryLocations = ({ multiColumn }) => {
  const intl = useIntl();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api().get('/api/v1/community_locations');
      setLocations(res.data);
    } catch {
      setError('Failed to load locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await api().post('/api/v1/community_locations', { name });
      setLocations(prev => [...prev, res.data]);
      setNewName('');
    } catch (err) {
      setAddError(err?.response?.data?.errors?.join(', ') || 'Could not add location.');
    } finally {
      setAdding(false);
    }
  }, [newName]);

  const handleToggleActive = useCallback(async (loc) => {
    try {
      const res = await api().put(`/api/v1/community_locations/${loc.id}`, { active: !loc.active });
      setLocations(prev => prev.map(l => l.id === loc.id ? res.data : l));
    } catch {
      // ignore
    }
  }, []);

  const handleSortOrder = useCallback(async (loc, value) => {
    const order = parseInt(value, 10);
    if (isNaN(order)) return;
    try {
      const res = await api().put(`/api/v1/community_locations/${loc.id}`, { sort_order: order });
      setLocations(prev => prev.map(l => l.id === loc.id ? res.data : l).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
    } catch {
      // ignore
    }
  }, []);

  const handleRemove = useCallback(async (loc) => {
    if (!window.confirm(`Remove "${loc.name}"?`)) return;
    try {
      await api().delete(`/api/v1/community_locations/${loc.id}`);
      setLocations(prev => prev.filter(l => l.id !== loc.id));
    } catch {
      // ignore
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleAdd();
  }, [handleAdd]);

  const title = intl.formatMessage(messages.title);

  return (
    <Column bindToDocument={!multiColumn} label={title}>
      <ColumnHeader
        icon='place'
        iconComponent={PlaceIcon}
        title={title}
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='scrollable'>
        <div className='cd-locations'>

          <div className='cd-locations__nav'>
            <Link to='/community_directory' className='button button-secondary'>
              {intl.formatMessage(messages.back)}
            </Link>
          </div>

          {/* Add new town */}
          <section className='cd-locations__section'>
            <div className='cd-locations__add-row'>
              <input
                type='text'
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={intl.formatMessage(messages.namePlaceholder)}
                className='cd-locations__input'
              />
              <button
                type='button'
                className='button'
                onClick={handleAdd}
                disabled={adding || !newName.trim()}
              >
                {intl.formatMessage(messages.add)}
              </button>
            </div>
            {addError && <p className='cd-locations__error'>{addError}</p>}
          </section>

          {/* Location list */}
          <section className='cd-locations__section'>
            {error && <p className='cd-locations__error'>{error}</p>}

            {loading ? (
              <LoadingIndicator />
            ) : locations.length === 0 ? (
              <p className='cd-locations__empty'>{intl.formatMessage(messages.empty)}</p>
            ) : (
              <div className='cd-locations__list'>
                {locations.map(loc => (
                  <div key={loc.id} className={`cd-locations__item${loc.active ? '' : ' cd-locations__item--inactive'}`}>
                    <span className='cd-locations__name'>{loc.name}</span>

                    <label className='cd-locations__sort-label'>
                      {intl.formatMessage(messages.sortOrder)}
                      <input
                        type='number'
                        defaultValue={loc.sort_order}
                        className='cd-locations__sort-input'
                        onBlur={e => handleSortOrder(loc, e.target.value)}
                      />
                    </label>

                    <button
                      type='button'
                      className={`button button-secondary cd-locations__toggle${loc.active ? '' : ' cd-locations__toggle--off'}`}
                      onClick={() => handleToggleActive(loc)}
                    >
                      {loc.active ? intl.formatMessage(messages.active) : intl.formatMessage(messages.inactive)}
                    </button>

                    <button
                      type='button'
                      className='button button--destructive button-secondary'
                      onClick={() => handleRemove(loc)}
                    >
                      {intl.formatMessage(messages.remove)}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      <Helmet>
        <title>{title}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

export default CommunityDirectoryLocations;
