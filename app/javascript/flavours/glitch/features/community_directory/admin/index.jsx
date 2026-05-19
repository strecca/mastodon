// app/javascript/flavours/glitch/features/community_directory/admin/index.jsx
//
// Community Category Builder — create new categories or edit existing ones.
// Existing categories are shown at the top; clicking one loads their config into the form.

import { useState, useCallback, useRef, useEffect } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import AddIcon from '@/material-icons/400-24px/add.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';

import { generateCategory, fetchCategories, fetchCategory, updateCategory } from '../../../actions/community_directory';

import FieldEditor from './components/field_editor';
import FormPreview from './components/form_preview';
import { BUILTIN_TEMPLATES, loadUserTemplates, saveUserTemplate, deleteUserTemplate } from './templates';

const messages = defineMessages({
  title:             { id: 'community_directory.admin.title',       defaultMessage: 'Community Category Builder' },
  catName:           { id: 'community_directory.admin.cat_name',    defaultMessage: 'Category key' },
  catNameHint:       { id: 'community_directory.admin.cat_name_hint', defaultMessage: 'Lowercase, no spaces. Becomes the URL and table name.' },
  catNameLocked:     { id: 'community_directory.admin.cat_name_locked', defaultMessage: 'Category key cannot be changed after creation.' },
  displayName:       { id: 'community_directory.admin.display_name', defaultMessage: 'Display name' },
  description:       { id: 'community_directory.admin.description',  defaultMessage: 'Description' },
  addField:          { id: 'community_directory.admin.add_field',    defaultMessage: 'Add field' },
  addGroup:          { id: 'community_directory.admin.add_group',    defaultMessage: 'Add group' },
  generate:          { id: 'community_directory.admin.generate',     defaultMessage: 'Generate community feature' },
  regenerate:        { id: 'community_directory.admin.regenerate',   defaultMessage: 'Save & Regenerate' },
  generating:        { id: 'community_directory.admin.generating',   defaultMessage: 'Saving…' },
  fieldsSection:     { id: 'community_directory.admin.fields_section',  defaultMessage: 'Fields' },
  groupsSection:     { id: 'community_directory.admin.groups_section',  defaultMessage: 'Field Groups' },
  previewSection:    { id: 'community_directory.admin.preview_section', defaultMessage: 'Form Preview' },
  back:              { id: 'community_directory.admin.back',         defaultMessage: 'Back to directory admin' },
  existingSection:   { id: 'community_directory.admin.existing',     defaultMessage: 'Existing Categories' },
  noExisting:        { id: 'community_directory.admin.no_existing',  defaultMessage: 'No categories yet. Build your first one below.' },
  createNew:         { id: 'community_directory.admin.create_new',   defaultMessage: '+ Create New Category' },
  editingBadge:      { id: 'community_directory.admin.editing_badge', defaultMessage: 'editing' },
  templateSection:   { id: 'community_directory.admin.template_section', defaultMessage: 'Start from a Template' },
  templateLoad:      { id: 'community_directory.admin.template_load',    defaultMessage: 'Load Template' },
  templateSave:      { id: 'community_directory.admin.template_save',    defaultMessage: 'Save as Template' },
  templateSaved:     { id: 'community_directory.admin.template_saved',   defaultMessage: 'Saved!' },
  templateDelete:    { id: 'community_directory.admin.template_delete',  defaultMessage: 'Delete' },
  templateNameHint:  { id: 'community_directory.admin.template_name_hint', defaultMessage: 'Template name…' },
  templateChoose:    { id: 'community_directory.admin.template_choose',  defaultMessage: '— choose a template —' },
});

const EMPTY_FIELD = {
  db_name:        '',
  label:          '',
  placeholder:    '',
  widget:         'text',
  required:       false,
  searchable:     false,
  show_in_list:   true,
  show_in_detail: true,
  options:        [],
  column:         'full',
  group:          'default',
};

const EMPTY_GROUP = { name: '', label: '', columns: 1 };

const CommunityDirectoryFormBuilder = ({ multiColumn }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const column = useRef(null);

  // Existing categories from Redux
  const categories = useAppSelector(state => state.get('community_directory')?.get('categories'));
  const categoriesLoading = useAppSelector(state => state.get('community_directory')?.get('categoriesLoading') || false);

  // Which existing category is loaded (null = creating new)
  const [editingCategory, setEditingCategory] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Form state
  const [catName, setCatName]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields]         = useState([{ ...EMPTY_FIELD }]);
  const [groups, setGroups]         = useState([]);

  // Action state
  const [generating, setGenerating] = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);

  // Template state
  const [userTemplates, setUserTemplates]       = useState(() => loadUserTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [savedTemplateMsg, setSavedTemplateMsg] = useState('');

  const allTemplates = [...BUILTIN_TEMPLATES, ...userTemplates];

  // Load category list on mount
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // ── Load an existing category into the form ─────────

  const handleLoadCategory = useCallback(async (name) => {
    setLoadingExisting(true);
    setError(null);
    setResult(null);
    try {
      const config = await dispatch(fetchCategory(name));
      setCatName(config.category_key || name);
      setDisplayName(config.display_name || '');
      setDescription(config.description || '');
      setGroups(Array.isArray(config.groups) ? config.groups : []);
      setFields(
        Array.isArray(config.fields) && config.fields.length > 0
          ? config.fields.map(f => ({ ...EMPTY_FIELD, ...f, options: Array.isArray(f.options) ? f.options : [], _isExisting: true }))
          : [{ ...EMPTY_FIELD }],
      );
      setEditingCategory(name);
    } catch (err) {
      setError(`Failed to load "${name}": ${err?.message || 'Unknown error'}`);
    } finally {
      setLoadingExisting(false);
    }
  }, [dispatch]);

  // ── Reset to blank new-category form ────────────────

  const handleCreateNew = useCallback(() => {
    setEditingCategory(null);
    setCatName('');
    setDisplayName('');
    setDescription('');
    setFields([{ ...EMPTY_FIELD }]);
    setGroups([]);
    setResult(null);
    setError(null);
  }, []);

  // ── Template handlers ────────────────────────────────

  const handleLoadTemplate = useCallback(() => {
    const tpl = allTemplates.find(t => t.id === selectedTemplate);
    if (!tpl) return;
    setFields(tpl.fields.map(f => ({ ...EMPTY_FIELD, ...f })));
    setGroups(Array.isArray(tpl.groups) ? tpl.groups : []);
    setSelectedTemplate('');
    setResult(null);
    setError(null);
  }, [allTemplates, selectedTemplate]);

  const handleSaveTemplate = useCallback(() => {
    const name = saveTemplateName.trim();
    if (!name) return;
    const updated = saveUserTemplate(name, fields, groups);
    setUserTemplates(updated);
    setSaveTemplateName('');
    setSavedTemplateMsg(intl.formatMessage(messages.templateSaved));
    setTimeout(() => setSavedTemplateMsg(''), 2500);
  }, [saveTemplateName, fields, groups, intl]);

  const handleDeleteTemplate = useCallback((id) => {
    const updated = deleteUserTemplate(id);
    setUserTemplates(updated);
    if (selectedTemplate === id) setSelectedTemplate('');
  }, [selectedTemplate]);

  // ── Form field handlers ──────────────────────────────

  const handleCatNameChange = useCallback((e) => {
    setCatName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  }, []);

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

  const handleAddGroup = useCallback(() => {
    setGroups(prev => [...prev, { ...EMPTY_GROUP }]);
  }, []);

  const handleGroupChange = useCallback((index, key, value) => {
    setGroups(prev => prev.map((g, i) => i === index ? { ...g, [key]: value } : g));
  }, []);

  const handleRemoveGroup = useCallback((index) => {
    setGroups(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Generate / Save & Regenerate ────────────────────

  const handleGenerate = useCallback(async () => {
    setError(null);
    setResult(null);

    if (!catName.trim()) { setError('Category key is required.'); return; }
    const validFields = fields.filter(f => f.db_name.trim() && f.label.trim());
    if (validFields.length === 0) { setError('At least one field with a name and label is required.'); return; }

    setGenerating(true);
    try {
      const config = {
        name:         catName.trim(),
        display_name: displayName.trim() || `Community ${catName.trim().replace(/\b\w/g, c => c.toUpperCase())}`,
        description:  description.trim(),
        icon:         'category',
        // Strip the internal _isExisting flag before sending to the API
        fields:       validFields.map(({ _isExisting, ...f }) => f),
        groups:       groups.filter(g => g.name.trim()),
      };

      const res = editingCategory
        ? await dispatch(updateCategory(editingCategory, config))
        : await dispatch(generateCategory(config));

      setResult(res);
      dispatch(fetchCategories());
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Operation failed.');
    } finally {
      setGenerating(false);
    }
  }, [dispatch, catName, displayName, description, fields, groups, editingCategory]);

  const handleHeaderClick = useCallback(() => {
    column.current?.scrollTop();
  }, []);

  const title = intl.formatMessage(messages.title);
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

          {/* ── Existing categories ── */}
          <section className='cd-builder__section cd-builder__section--existing'>
            <h3 className='cd-builder__section-title'>
              {intl.formatMessage(messages.existingSection)}
            </h3>

            {(categoriesLoading || loadingExisting) ? (
              <LoadingIndicator />
            ) : categories && categories.size > 0 ? (
              <div className='cd-builder__existing-list'>
                {categories.map((cat, i) => {
                  const name = cat.get('name');
                  const catDisplayName = cat.get('display_name') || name;
                  const count = cat.get('entries_count') || 0;
                  const isActive = editingCategory === name;
                  return (
                    <button
                      key={name || i}
                      type='button'
                      className={`cd-builder__existing-btn${isActive ? ' cd-builder__existing-btn--active' : ''}`}
                      onClick={() => isActive ? handleCreateNew() : handleLoadCategory(name)}
                    >
                      <span className='cd-builder__existing-name'>{catDisplayName}</span>
                      <span className='cd-builder__existing-key'>/community_{name}</span>
                      <span className='cd-builder__existing-count'>{count} {count === 1 ? 'entry' : 'entries'}</span>
                      {isActive && <span className='cd-builder__existing-badge'>{intl.formatMessage(messages.editingBadge)}</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className='cd-builder__hint'>{intl.formatMessage(messages.noExisting)}</p>
            )}

            {editingCategory && (
              <button type='button' onClick={handleCreateNew} className='button button-secondary cd-builder__new-btn'>
                {intl.formatMessage(messages.createNew)}
              </button>
            )}
          </section>

          {/* ── Status messages ── */}
          {result && (
            <div className='cd-builder__success'>
              <strong>{editingCategory ? 'Category updated!' : 'Feature generated!'}</strong>
              <p>{result.message}</p>
              {result.new_columns?.length > 0 && (
                <p>New columns added: {result.new_columns.join(', ')}</p>
              )}
              <p>Files modified: {result.files_modified?.length || 0}</p>
              <code>rm -rf public/packs-dev tmp/cache &amp;&amp; bin/dev</code>
            </div>
          )}

          {error && <div className='cd-builder__error'>{error}</div>}

          {/* ── Templates (new category only) ── */}
          {!editingCategory && (
            <section className='cd-builder__section cd-builder__section--templates'>
              <h3 className='cd-builder__section-title'>
                {intl.formatMessage(messages.templateSection)}
              </h3>
              <p className='cd-builder__hint'>
                Load a pre-built field set to skip repetitive setup. Checkbox options are left blank so you can add your own.
              </p>

              <div className='cd-builder__template-row'>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className='cd-builder__select'
                >
                  <option value=''>{intl.formatMessage(messages.templateChoose)}</option>
                  {BUILTIN_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {userTemplates.length > 0 && (
                    <optgroup label='Your saved templates'>
                      {userTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <button
                  type='button'
                  onClick={handleLoadTemplate}
                  className='button button-secondary'
                  disabled={!selectedTemplate}
                >
                  {intl.formatMessage(messages.templateLoad)}
                </button>

                {selectedTemplate && userTemplates.some(t => t.id === selectedTemplate) && (
                  <button
                    type='button'
                    onClick={() => handleDeleteTemplate(selectedTemplate)}
                    className='cd-builder__remove-btn'
                    title={intl.formatMessage(messages.templateDelete)}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className='cd-builder__save-template'>
                <input
                  type='text'
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder={intl.formatMessage(messages.templateNameHint)}
                  className='cd-builder__input cd-builder__input--sm'
                />
                <button
                  type='button'
                  onClick={handleSaveTemplate}
                  className='button button-secondary'
                  disabled={!saveTemplateName.trim() || fields.every(f => !f.db_name.trim())}
                >
                  {intl.formatMessage(messages.templateSave)}
                </button>
                {savedTemplateMsg && (
                  <span className='cd-builder__hint cd-builder__hint--success'>
                    {savedTemplateMsg}
                  </span>
                )}
              </div>
            </section>
          )}

          {/* ── Category config ── */}
          <section className='cd-builder__section'>
            <h3 className='cd-builder__section-title'>Category</h3>

            <div className='cd-builder__field'>
              <label htmlFor='cd-name'>{intl.formatMessage(messages.catName)}</label>
              <input
                id='cd-name'
                type='text'
                value={catName}
                onChange={handleCatNameChange}
                placeholder='artists'
                className='cd-builder__input'
                autoComplete='off'
                readOnly={!!editingCategory}
                disabled={!!editingCategory}
              />
              <span className='cd-builder__hint'>{intl.formatMessage(messages.catNameHint)}</span>
              {catName && !editingCategory && (
                <span className='cd-builder__hint'>Route: /community_{catName}</span>
              )}
              {editingCategory && (
                <span className='cd-builder__hint cd-builder__hint--warn'>
                  {intl.formatMessage(messages.catNameLocked)}
                </span>
              )}
            </div>

            <div className='cd-builder__field'>
              <label htmlFor='cd-display'>{intl.formatMessage(messages.displayName)}</label>
              <input id='cd-display' type='text' value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder='Community Artists' className='cd-builder__input' />
            </div>

            <div className='cd-builder__field'>
              <label htmlFor='cd-desc'>{intl.formatMessage(messages.description)}</label>
              <textarea id='cd-desc' value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Discover local artists in our community'
                className='cd-builder__textarea' rows={2} />
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
                key={field._isExisting ? `existing-${field.db_name}` : `new-${idx}`}
                index={idx}
                field={field}
                groupNames={groupNames}
                onChange={handleFieldChange}
                onRemove={handleRemoveField}
                onMove={handleMoveField}
                isFirst={idx === 0}
                isLast={idx === fields.length - 1}
                isExisting={!!field._isExisting}
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

          {/* ── Generate / Save & Regenerate ── */}
          <section className='cd-builder__section cd-builder__section--generate'>
            <button
              type='button'
              onClick={handleGenerate}
              className='button cd-builder__generate-btn'
              disabled={generating || !!result}
            >
              {generating
                ? intl.formatMessage(messages.generating)
                : editingCategory
                  ? intl.formatMessage(messages.regenerate)
                  : intl.formatMessage(messages.generate)}
            </button>
            {result && (
              <button type='button' onClick={handleCreateNew} className='button button-secondary' style={{ marginLeft: '8px' }}>
                {intl.formatMessage(messages.createNew)}
              </button>
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

export default CommunityDirectoryFormBuilder;
