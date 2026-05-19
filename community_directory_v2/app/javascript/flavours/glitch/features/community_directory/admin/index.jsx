// app/javascript/flavours/glitch/features/community_directory/admin/index.jsx
//
// The form builder UI. Admin designs a category here:
// 1. Set name, display name, description
// 2. Add fields (label, type, options, required, searchable, column, group)
// 3. Organize into groups
// 4. Click Generate to scaffold the entire feature

import { useState, useCallback, useRef } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import AddIcon from '@/material-icons/400-24px/add.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { useAppDispatch } from 'flavours/glitch/store';

import { generateCategory } from '../../../actions/community_directory';

import FieldEditor from './components/field_editor';
import FormPreview from './components/form_preview';

const messages = defineMessages({
  title: { id: 'community_directory.admin.title', defaultMessage: 'Create Community Category' },
  catName: { id: 'community_directory.admin.cat_name', defaultMessage: 'Category key' },
  catNameHint: { id: 'community_directory.admin.cat_name_hint', defaultMessage: 'Lowercase, no spaces. Becomes the URL and table name.' },
  displayName: { id: 'community_directory.admin.display_name', defaultMessage: 'Display name' },
  description: { id: 'community_directory.admin.description', defaultMessage: 'Description' },
  addField: { id: 'community_directory.admin.add_field', defaultMessage: 'Add field' },
  addGroup: { id: 'community_directory.admin.add_group', defaultMessage: 'Add group' },
  generate: { id: 'community_directory.admin.generate', defaultMessage: 'Generate community feature' },
  generating: { id: 'community_directory.admin.generating', defaultMessage: 'Generating files…' },
  fieldsSection: { id: 'community_directory.admin.fields_section', defaultMessage: 'Fields' },
  groupsSection: { id: 'community_directory.admin.groups_section', defaultMessage: 'Field Groups' },
  previewSection: { id: 'community_directory.admin.preview_section', defaultMessage: 'Form Preview' },
  groupName: { id: 'community_directory.admin.group_name', defaultMessage: 'Group key' },
  groupLabel: { id: 'community_directory.admin.group_label', defaultMessage: 'Group label' },
  groupCols: { id: 'community_directory.admin.group_cols', defaultMessage: 'Columns' },
  back: { id: 'community_directory.admin.back', defaultMessage: 'Back to directory admin' },
});

const EMPTY_FIELD = {
  db_name: '',
  label: '',
  widget: 'text',
  required: false,
  searchable: false,
  options: [],
  column: 'full',
  group: 'default',
};

const EMPTY_GROUP = { name: '', label: '', columns: 1 };

const CommunityDirectoryFormBuilder = ({ multiColumn }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const column = useRef(null);

  // Category-level config
  const [catName, setCatName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  // Fields
  const [fields, setFields] = useState([{ ...EMPTY_FIELD }]);

  // Groups
  const [groups, setGroups] = useState([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // ── Category config handlers ────────────────────────

  const handleCatNameChange = useCallback((e) => {
    setCatName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  }, []);

  const handleDisplayNameChange = useCallback((e) => {
    setDisplayName(e.target.value);
  }, []);

  const handleDescriptionChange = useCallback((e) => {
    setDescription(e.target.value);
  }, []);

  // ── Field handlers ──────────────────────────────────

  const handleFieldChange = useCallback((index, updated) => {
    setFields(prev => prev.map((f, i) => i === index ? updated : f));
  }, []);

  const handleAddField = useCallback(() => {
    setFields(prev => [...prev, { ...EMPTY_FIELD }]);
  }, []);

  const handleRemoveField = useCallback((index) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleMoveField = useCallback((index, direction) => {
    setFields(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  // ── Group handlers ──────────────────────────────────

  const handleAddGroup = useCallback(() => {
    setGroups(prev => [...prev, { ...EMPTY_GROUP }]);
  }, []);

  const handleGroupChange = useCallback((index, key, value) => {
    setGroups(prev => prev.map((g, i) => i === index ? { ...g, [key]: value } : g));
  }, []);

  const handleRemoveGroup = useCallback((index) => {
    setGroups(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Generate ────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setError(null);
    setResult(null);

    // Validate
    if (!catName.trim()) { setError('Category key is required.'); return; }
    const validFields = fields.filter(f => f.db_name.trim() && f.label.trim());
    if (validFields.length === 0) { setError('At least one field with a name and label is required.'); return; }

    setGenerating(true);

    try {
      const config = {
        name: catName.trim(),
        display_name: displayName.trim() || `Community ${catName.trim().replace(/\b\w/g, c => c.toUpperCase())}`,
        description: description.trim(),
        icon: 'category',
        fields: validFields,
        groups: groups.filter(g => g.name.trim()),
      };

      const res = await dispatch(generateCategory(config));
      setResult(res);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  }, [dispatch, catName, displayName, description, fields, groups]);

  const handleHeaderClick = useCallback(() => {
    column.current?.scrollTop();
  }, []);

  const title = intl.formatMessage(messages.title);

  // Available group names for the field editor dropdown
  const groupNames = ['default', ...groups.map(g => g.name).filter(Boolean)];

  return (
    <Column bindToDocument={!multiColumn} ref={column} label={title}>
      <ColumnHeader
        icon='plus'
        iconComponent={AddIcon}
        title={title}
        onClick={handleHeaderClick}
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='scrollable'>
        <div className='cd-builder'>

          <div className='cd-builder__nav'>
            <Link to='/community_directory'>{intl.formatMessage(messages.back)}</Link>
          </div>

          {/* ── Success / Error messages ── */}
          {result && (
            <div className='cd-builder__success'>
              <strong>Feature generated!</strong>
              <p>{result.message}</p>
              <p>Files created: {result.files_created?.length || 0}</p>
              <p>Files modified: {result.files_modified?.length || 0}</p>
              <code>rm -rf public/packs-dev tmp/cache && bin/dev</code>
            </div>
          )}

          {error && (
            <div className='cd-builder__error'>{error}</div>
          )}

          {/* ── Category Config ── */}
          <section className='cd-builder__section'>
            <h3 className='cd-builder__section-title'>Category</h3>

            <div className='cd-builder__field'>
              <label htmlFor='cd-name'>{intl.formatMessage(messages.catName)}</label>
              <input id='cd-name' type='text' value={catName} onChange={handleCatNameChange}
                placeholder='artists' className='cd-builder__input' autoComplete='off' />
              <span className='cd-builder__hint'>{intl.formatMessage(messages.catNameHint)}</span>
              {catName && <span className='cd-builder__hint'>Route: /community_{catName}</span>}
            </div>

            <div className='cd-builder__field'>
              <label htmlFor='cd-display'>{intl.formatMessage(messages.displayName)}</label>
              <input id='cd-display' type='text' value={displayName} onChange={handleDisplayNameChange}
                placeholder='Community Artists' className='cd-builder__input' />
            </div>

            <div className='cd-builder__field'>
              <label htmlFor='cd-desc'>{intl.formatMessage(messages.description)}</label>
              <textarea id='cd-desc' value={description} onChange={handleDescriptionChange}
                placeholder='Discover local artists in our community' className='cd-builder__textarea' rows={2} />
            </div>
          </section>

          {/* ── Groups ── */}
          <section className='cd-builder__section'>
            <h3 className='cd-builder__section-title'>
              {intl.formatMessage(messages.groupsSection)}
            </h3>

            <p className='cd-builder__hint'>
              Groups organize fields into labeled sections. Each group can use 1 or 2 column layout.
              Fields default to the "default" group if not assigned.
            </p>

            {groups.map((group, idx) => (
              <div key={idx} className='cd-builder__group-row'>
                <input type='text' value={group.name} placeholder='group_key'
                  onChange={(e) => handleGroupChange(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className='cd-builder__input cd-builder__input--sm' />
                <input type='text' value={group.label} placeholder='Group Label'
                  onChange={(e) => handleGroupChange(idx, 'label', e.target.value)}
                  className='cd-builder__input cd-builder__input--sm' />
                <select value={group.columns}
                  onChange={(e) => handleGroupChange(idx, 'columns', parseInt(e.target.value, 10))}
                  className='cd-builder__select cd-builder__select--xs'>
                  <option value={1}>1 col</option>
                  <option value={2}>2 cols</option>
                </select>
                <button type='button' onClick={() => handleRemoveGroup(idx)} className='cd-builder__remove-btn'>✕</button>
              </div>
            ))}

            <button type='button' onClick={handleAddGroup} className='button button-secondary'>
              {intl.formatMessage(messages.addGroup)}
            </button>
          </section>

          {/* ── Fields ── */}
          <section className='cd-builder__section'>
            <h3 className='cd-builder__section-title'>
              {intl.formatMessage(messages.fieldsSection)} ({fields.length})
            </h3>

            {fields.map((field, idx) => (
              <FieldEditor
                key={idx}
                index={idx}
                field={field}
                groupNames={groupNames}
                onChange={handleFieldChange}
                onRemove={handleRemoveField}
                onMove={handleMoveField}
                isFirst={idx === 0}
                isLast={idx === fields.length - 1}
              />
            ))}

            <button type='button' onClick={handleAddField} className='button button-secondary'>
              {intl.formatMessage(messages.addField)}
            </button>
          </section>

          {/* ── Preview ── */}
          <section className='cd-builder__section'>
            <h3 className='cd-builder__section-title'>
              {intl.formatMessage(messages.previewSection)}
            </h3>
            <FormPreview fields={fields} groups={groups} />
          </section>

          {/* ── Generate ── */}
          <section className='cd-builder__section cd-builder__section--generate'>
            <button
              type='button'
              onClick={handleGenerate}
              className='button cd-builder__generate-btn'
              disabled={generating || !!result}
            >
              {generating
                ? intl.formatMessage(messages.generating)
                : intl.formatMessage(messages.generate)}
            </button>
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

export default CommunityDirectoryFormBuilder;
