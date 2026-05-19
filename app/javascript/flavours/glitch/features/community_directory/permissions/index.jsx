// Permissions manager — admin sets trusted/steward status for accounts.

import { useEffect, useCallback, useState } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import {
  fetchPermissions,
  fetchCategories,
  savePermission,
  deletePermission,
} from '../../../actions/community_directory';

const messages = defineMessages({
  title:       { id: 'community_directory.permissions.title',       defaultMessage: 'Permissions' },
  back:        { id: 'community_directory.permissions.back',        defaultMessage: '← Back to Admin' },
  username:    { id: 'community_directory.permissions.username',    defaultMessage: '@username' },
  category:    { id: 'community_directory.permissions.category',   defaultMessage: 'Category (leave blank for global)' },
  trusted:     { id: 'community_directory.permissions.trusted',    defaultMessage: 'Trusted — auto-approve entries' },
  steward:     { id: 'community_directory.permissions.steward',    defaultMessage: 'Steward — can approve others\' entries' },
  save:        { id: 'community_directory.permissions.save',       defaultMessage: 'Save Permission' },
  remove:      { id: 'community_directory.permissions.remove',     defaultMessage: 'Remove' },
  empty:       { id: 'community_directory.permissions.empty',      defaultMessage: 'No special permissions set.' },
  allCategories: { id: 'community_directory.permissions.all',      defaultMessage: 'All categories' },
  addHeading:  { id: 'community_directory.permissions.add',        defaultMessage: 'Add or update permission' },
  listHeading: { id: 'community_directory.permissions.list',       defaultMessage: 'Existing permissions' },
});

const CommunityDirectoryPermissions = ({ multiColumn }) => {
  const intl     = useIntl();
  const dispatch = useAppDispatch();

  const permissions = useAppSelector(s => s.get('community_directory')?.get('permissions'));
  const loading     = useAppSelector(s => s.get('community_directory')?.get('permissionsLoading') || false);
  const categories  = useAppSelector(s => s.get('community_directory')?.get('categories'));

  const [username,   setUsername]   = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [trusted,    setTrusted]    = useState(false);
  const [isSteward,  setIsSteward]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    dispatch(fetchPermissions());
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleSave = useCallback(async () => {
    if (!username.trim()) { setError('Username is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await dispatch(savePermission({
        username:     username.trim().replace(/^@/, ''),
        category_key: categoryKey || null,
        trusted,
        is_steward:   isSteward,
      }));
      setUsername('');
      setCategoryKey('');
      setTrusted(false);
      setIsSteward(false);
    } catch {
      setError('Could not save — check the username and try again.');
    } finally {
      setSaving(false);
    }
  }, [dispatch, username, categoryKey, trusted, isSteward]);

  const handleDelete = useCallback((id) => {
    if (window.confirm('Remove this permission?')) {
      dispatch(deletePermission(id));
    }
  }, [dispatch]);

  const title = intl.formatMessage(messages.title);

  return (
    <Column bindToDocument={!multiColumn} label={title}>
      <ColumnHeader icon='user-shield' title={title} multiColumn={multiColumn} showBackButton />

      <div className='scrollable'>
        <div className='cd-permissions'>
          <div className='cd-permissions__nav'>
            <Link to='/community_directory' className='button button-secondary'>
              {intl.formatMessage(messages.back)}
            </Link>
          </div>

          {/* Add / update form */}
          <section className='cd-permissions__section'>
            <h3 className='cd-permissions__heading'>
              {intl.formatMessage(messages.addHeading)}
            </h3>

            {error && <p className='cd-permissions__error'>{error}</p>}

            <div className='cd-permissions__form'>
              <input
                type='text'
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={intl.formatMessage(messages.username)}
                className='cd-permissions__input'
              />

              <select
                value={categoryKey}
                onChange={e => setCategoryKey(e.target.value)}
                className='cd-permissions__select'
              >
                <option value=''>— {intl.formatMessage(messages.allCategories)} —</option>
                {categories && categories.map(cat => (
                  <option key={cat.get('name')} value={cat.get('name')}>
                    {cat.get('display_name') || cat.get('name')}
                  </option>
                ))}
              </select>

              <label className='cd-permissions__checkbox'>
                <input
                  type='checkbox'
                  checked={trusted}
                  onChange={e => setTrusted(e.target.checked)}
                />
                {intl.formatMessage(messages.trusted)}
              </label>

              <label className='cd-permissions__checkbox'>
                <input
                  type='checkbox'
                  checked={isSteward}
                  onChange={e => setIsSteward(e.target.checked)}
                />
                {intl.formatMessage(messages.steward)}
              </label>

              <button
                type='button'
                className='button'
                onClick={handleSave}
                disabled={saving}
              >
                {intl.formatMessage(messages.save)}
              </button>
            </div>
          </section>

          {/* Existing permissions */}
          <section className='cd-permissions__section'>
            <h3 className='cd-permissions__heading'>
              {intl.formatMessage(messages.listHeading)}
            </h3>

            {loading ? (
              <LoadingIndicator />
            ) : !permissions || permissions.size === 0 ? (
              <p className='cd-permissions__empty'>
                {intl.formatMessage(messages.empty)}
              </p>
            ) : (
              <div className='cd-permissions__list'>
                {permissions.map(perm => (
                  <div key={perm.get('id')} className='cd-permissions__item'>
                    <div className='cd-permissions__item-info'>
                      <img
                        src={perm.getIn(['account', 'avatar'])}
                        alt={perm.getIn(['account', 'username'])}
                        className='cd-permissions__avatar'
                      />
                      <div className='cd-permissions__item-text'>
                        <strong>@{perm.getIn(['account', 'username'])}</strong>
                        <span className='cd-permissions__scope'>
                          {perm.get('category_key')
                            ? perm.get('category_key')
                            : intl.formatMessage(messages.allCategories)}
                        </span>
                      </div>
                    </div>

                    <div className='cd-permissions__badges'>
                      {perm.get('trusted') && (
                        <span className='cd-permissions__badge cd-permissions__badge--trusted'>Trusted</span>
                      )}
                      {perm.get('is_steward') && (
                        <span className='cd-permissions__badge cd-permissions__badge--steward'>Steward</span>
                      )}
                    </div>

                    <button
                      type='button'
                      className='button button--destructive button-secondary'
                      onClick={() => handleDelete(perm.get('id'))}
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

export default CommunityDirectoryPermissions;
