// features/community_directory/edit/index.jsx
//
// Admin page: edit an existing community category.
// Route: /community_directory/edit/:category
//
// Allows:
//   - Editing label, placeholder, show_in_list, show_in_detail, column, group
//     for every existing field (db_name and widget type are locked)
//   - Adding new fields (full field editor — these add DB columns via migration)
//   - Editing groups (add / rename / change column count / remove)
//   - Editing display_name, description
//
// New DB columns are added by a migration; no columns are ever dropped.

import { useState, useEffect, useCallback, useRef } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link, useParams } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useAppDispatch } from 'flavours/glitch/store';

import { fetchCategory, updateCategory } from '../../../actions/community_directory';
import FieldEditor from '../admin/components/field_editor';

const messages = defineMessages({
  title:          { id: 'community_directory.edit.title',           defaultMessage: 'Edit Category' },
  back:           { id: 'community_directory.edit.back',            defaultMessage: 'Back to directory admin' },
  save:           { id: 'community_directory.edit.save',            defaultMessage: 'Save changes' },
  saving:         { id: 'community_directory.edit.saving',          defaultMessage: 'Saving…' },
  addField:       { id: 'community_directory.edit.add_field',       defaultMessage: 'Add new field (adds DB column)' },
  addGroup:       { id: 'community_directory.edit.add_group',       defaultMessage: 'Add group' },
  existingFields: { id: 'community_directory.edit.existing_fields', defaultMessage: 'Existing Fields' },
  newFields:      { id: 'community_directory.edit.new_fields',      defaultMessage: 'New Fields' },
  newFieldsHint:  { id: 'community_directory.edit.new_fields_hint', defaultMessage: 'Each new field adds a column to the database.' },
  groupsSection:  { id: 'community_directory.edit.groups_section',  defaultMessage: 'Field Groups' },
  metaSection:    { id: 'community_directory.edit.meta_section',    defaultMessage: 'Category Info' },
  showInList:     { id: 'community_directory.edit.show_in_list',    defaultMessage: 'Show in list' },
  showInDetail:   { id: 'community_directory.edit.show_in_detail',  defaultMessage: 'Show in detail' },
  placeholder:    { id: 'community_directory.edit.placeholder',     defaultMessage: 'Placeholder hint' },
});

const EMPTY_NEW_FIELD = {
  db_name: '', label: '', placeholder: '', widget: 'text',
  required: false, searchable: false,
  show_in_list: true, show_in_detail: true,
  options: [], column: 'full', group: 'default',
};

const COLUMN_OPTIONS = [
  { value: 'full', label: 'Full width' },
  { value: '1',    label: 'Column 1'   },
  { value: '2',    label: 'Column 2'   },
];

const WIDGET_LABELS = {
  text: 'Text', textarea: 'Textarea', select: 'Dropdown',
  checkboxes: 'Checkboxes', radio: 'Radio', date: 'Date',
  url: 'URL', email: 'Email', number: 'Number',
};

const CommunityDirectoryEdit = ({ multiColumn }) => {
  const intl     = useIntl();
  const dispatch = useAppDispatch();
  const column   = useRef(null);
  const { category } = useParams();

  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [fields,      setFields]      = useState([]);
  const [newFields,   setNewFields]   = useState([]);
  const [groups,      setGroups]      = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [result,      setResult]      = useState(null);
  const [saveError,   setSaveError]   = useState(null);

  // ── Load config ──────────────────────────────────────────────

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    dispatch(fetchCategory(category))
      .then(config => {
        setDisplayName(config.display_name || '');
        setDescription(config.description  || '');
        setFields(config.fields || []);
        setGroups(config.groups || []);
        setLoading(false);
      })
      .catch(err => {
        setLoadError(err?.response?.data?.error || err?.message || 'Failed to load category');
        setLoading(false);
      });
  }, [dispatch, category]);

  // ── Existing field handlers ──────────────────────────────────

  const handleExistingFieldChange = useCallback((index, key, value) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
  }, []);

  const handleMoveExisting = useCallback((index, direction) => {
    setFields(prev => {
      const next   = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  // ── New field handlers ───────────────────────────────────────

  const handleAddNewField    = useCallback(() => setNewFields(prev => [...prev, { ...EMPTY_NEW_FIELD }]), []);
  const handleNewFieldChange = useCallback((index, updated) => setNewFields(prev => prev.map((f, i) => i === index ? updated : f)), []);
  const handleRemoveNewField = useCallback((index) => setNewFields(prev => prev.filter((_, i) => i !== index)), []);
  const handleMoveNewField   = useCallback((index, direction) => {
    setNewFields(prev => {
      const next   = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  // ── Group handlers ───────────────────────────────────────────

  const handleAddGroup    = useCallback(() => setGroups(prev => [...prev, { name: '', label: '', columns: 1 }]), []);
  const handleGroupChange = useCallback((index, key, value) => setGroups(prev => prev.map((g, i) => i === index ? { ...g, [key]: value } : g)), []);
  const handleRemoveGroup = useCallback((index) => setGroups(prev => prev.filter((_, i) => i !== index)), []);

  // ── Save ─────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setResult(null);
    const validNew  = newFields.filter(f => f.db_name.trim() && f.label.trim());
    const allFields = [...fields, ...validNew];
    setSaving(true);
    try {
      const config = {
        display_name: displayName.trim(),
        description:  description.trim(),
        fields:       allFields,
        groups:       groups.filter(g => g.name.trim()),
      };
      const res = await dispatch(updateCategory(category, config));
      setResult(res);
      if (validNew.length > 0) { setFields(allFields); setNewFields([]); }
    } catch (err) {
      setSaveError(err?.response?.data?.error || err?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [dispatch, category, displayName, description, fields, newFields, groups]);

  const handleHeaderClick = useCallback(() => column.current?.scrollTop(), []);

  const groupNames = ['default', ...groups.map(g => g.name).filter(Boolean)];
  const title = `${intl.formatMessage(messages.title)}: ${category}`;

  if (loading) {
    return (
      <Column bindToDocument={!multiColumn} ref={column} label={title}>
        <ColumnHeader icon='cog' title={title} multiColumn={multiColumn} showBackButton />
        <div className='scrollable'><LoadingIndicator /></div>
      </Column>
    );
  }

  if (loadError) {
    return (
      <Column bindToDocument={!multiColumn} ref={column} label={title}>
        <ColumnHeader icon='cog' title={title} multiColumn={multiColumn} showBackButton />
        <div className='scrollable'><div className='empty-column-indicator'>{loadError}</div></div>
      </Column>
    );
  }

  return (
    <Column bindToDocument={!multiColumn} ref={column} label={title}>
      <ColumnHeader icon='cog' title={title} onClick={handleHeaderClick}
        multiColumn={multiColumn} showBackButton />

      <div className='scrollable'>
        <div className='cd-builder'>

          <div className='cd-builder__nav'>
            <Link to='/community_directory'>{intl.formatMessage(messages.back)}</Link>
          </div>

          {result && (
            <div className='cd-builder__success'>
              <strong>{result.message}</strong>
              {result.new_columns?.length > 0 && <p>New DB columns: {result.new_columns.join(', ')}</p>}
              {result.files_created?.length > 0 && <p>Files created: {result.files_created.length}</p>}
            </div>
          )}
          {saveError && <div className='cd-builder__error'>{saveError}</div>}

          {/* ── Category meta ── */}
          <section className='cd-builder__section'>
            <h3 className='cd-builder__section-title'>{intl.formatMessage(messages.metaSection)}</h3>
            <div className='cd-builder__field'>
              <label htmlFor='cd-edit-display'>Display name</label>
              <input id='cd-edit-display' type='text' value={displayName}
                onChange={e => setDisplayName(e.target.value)} className='cd-builder__input' />
            </div>
            <div className='cd-builder__field'>
              <label htmlFor='cd-edit-desc'>Description</label>
              <textarea id='cd-edit-desc' value={description}
                onChange={e => setDescription(e.target.value)}
                className='cd-builder__textarea' rows={2} />
            </div>
          </section>

          {/* ── Groups ── */}
          <section className='cd-builder__section'>
            <h3 className='cd-builder__section-title'>{intl.formatMessage(messages.groupsSection)}</h3>
            {groups.map((group, idx) => (
              <div key={idx} className='cd-builder__group-row'>
                <input type='text' value={group.name} placeholder='group_key'
                  onChange={e => handleGroupChange(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className='cd-builder__input cd-builder__input--sm' />
                <input type='text' value={group.label} placeholder='Group Label'
                  onChange={e => handleGroupChange(idx, 'label', e.target.value)}
                  className='cd-builder__input cd-builder__input--sm' />
                <select value={group.columns}
                  onChange={e => handleGroupChange(idx, 'columns', parseInt(e.target.value, 10))}
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

          {/* ── Existing Fields ── */}
          <section className='cd-builder__section'>
            <h3 className='cd-builder__section-title'>
              {intl.formatMessage(messages.existingFields)} ({fields.length})
            </h3>
            <p className='cd-builder__hint'>
              DB column name and widget type are locked. Add a new field below to add a DB column.
            </p>
            {fields.map((field, idx) => (
              <ExistingFieldRow
                key={field.db_name}
                field={field}
                index={idx}
                isFirst={idx === 0}
                isLast={idx === fields.length - 1}
                groupNames={groupNames}
                onChange={handleExistingFieldChange}
                onMove={handleMoveExisting}
                intl={intl}
                messages={messages}
              />
            ))}
          </section>

          {/* ── New Fields ── */}
          <section className='cd-builder__section'>
            <h3 className='cd-builder__section-title'>{intl.formatMessage(messages.newFields)}</h3>
            <p className='cd-builder__hint'>{intl.formatMessage(messages.newFieldsHint)}</p>
            {newFields.map((field, idx) => (
              <FieldEditor
                key={idx}
                index={idx}
                field={field}
                groupNames={groupNames}
                onChange={handleNewFieldChange}
                onRemove={handleRemoveNewField}
                onMove={handleMoveNewField}
                isFirst={idx === 0}
                isLast={idx === newFields.length - 1}
              />
            ))}
            <button type='button' onClick={handleAddNewField} className='button button-secondary'>
              {intl.formatMessage(messages.addField)}
            </button>
          </section>

          {/* ── Save ── */}
          <section className='cd-builder__section cd-builder__section--generate'>
            <button type='button' onClick={handleSave}
              className='button cd-builder__generate-btn' disabled={saving}>
              {saving ? intl.formatMessage(messages.saving) : intl.formatMessage(messages.save)}
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

// ── ExistingFieldRow ─────────────────────────────────────────────────────────
// Editable: label, placeholder, show_in_list, show_in_detail, required,
//           searchable, column, group.
// Locked:   db_name, widget type.

const ExistingFieldRow = ({ field, index, isFirst, isLast, groupNames, onChange, onMove, intl, messages }) => (
  <div className='cd-field-editor'>
    <div className='cd-field-editor__header'>
      <span className='cd-field-editor__number'>#{index + 1}</span>
      <code className='cd-field-editor__locked-name'>{field.db_name}</code>
      <span className='cd-field-editor__locked-type'>{WIDGET_LABELS[field.widget] || field.widget}</span>
      <div className='cd-field-editor__move'>
        <button type='button' onClick={() => onMove(index, -1)} disabled={isFirst}
          className='cd-field-editor__move-btn' title='Move up'>↑</button>
        <button type='button' onClick={() => onMove(index, 1)} disabled={isLast}
          className='cd-field-editor__move-btn' title='Move down'>↓</button>
      </div>
    </div>

    <div className='cd-field-editor__body'>
      <div className='cd-field-editor__row'>
        <div className='cd-field-editor__col'>
          <label>Label</label>
          <input type='text' value={field.label}
            onChange={e => onChange(index, 'label', e.target.value)}
            className='cd-builder__input' />
        </div>
        <div className='cd-field-editor__col'>
          <label>{intl.formatMessage(messages.placeholder)}</label>
          <input type='text' value={field.placeholder || ''}
            onChange={e => onChange(index, 'placeholder', e.target.value)}
            className='cd-builder__input' placeholder='Hint shown inside the input' />
        </div>
      </div>

      <div className='cd-field-editor__row'>
        <div className='cd-field-editor__col'>
          <label>Column</label>
          <select value={field.column} onChange={e => onChange(index, 'column', e.target.value)}
            className='cd-builder__select'>
            {COLUMN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className='cd-field-editor__col'>
          <label>Group</label>
          <select value={field.group} onChange={e => onChange(index, 'group', e.target.value)}
            className='cd-builder__select'>
            {groupNames.map(gn => <option key={gn} value={gn}>{gn}</option>)}
          </select>
        </div>
      </div>

      <div className='cd-field-editor__toggles'>
        <label className='cd-field-editor__toggle'>
          <input type='checkbox' checked={field.show_in_list !== false}
            onChange={e => onChange(index, 'show_in_list', e.target.checked)} />
          <span>{intl.formatMessage(messages.showInList)}</span>
        </label>
        <label className='cd-field-editor__toggle'>
          <input type='checkbox' checked={field.show_in_detail !== false}
            onChange={e => onChange(index, 'show_in_detail', e.target.checked)} />
          <span>{intl.formatMessage(messages.showInDetail)}</span>
        </label>
        <label className='cd-field-editor__toggle'>
          <input type='checkbox' checked={field.required}
            onChange={e => onChange(index, 'required', e.target.checked)} />
          <span>Required</span>
        </label>
        <label className='cd-field-editor__toggle'>
          <input type='checkbox' checked={field.searchable}
            onChange={e => onChange(index, 'searchable', e.target.checked)} />
          <span>Searchable</span>
        </label>
      </div>
    </div>
  </div>
);

export default CommunityDirectoryEdit;
