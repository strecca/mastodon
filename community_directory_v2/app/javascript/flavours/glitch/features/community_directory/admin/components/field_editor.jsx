// app/javascript/flavours/glitch/features/community_directory/admin/components/field_editor.jsx

import { useState, useCallback } from 'react';

const WIDGET_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'radio', label: 'Radio' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
];

const COLUMN_OPTIONS = [
  { value: 'full', label: 'Full width' },
  { value: '1', label: 'Column 1' },
  { value: '2', label: 'Column 2' },
];

const NEEDS_OPTIONS = ['select', 'checkboxes', 'radio'];

const toDbName = (label) =>
  label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const FieldEditor = ({ index, field, groupNames, onChange, onRemove, onMove, isFirst, isLast }) => {
  const [optionInput, setOptionInput] = useState('');
  const [autoDbName, setAutoDbName] = useState(true);

  const update = useCallback((key, value) => {
    const updated = { ...field, [key]: value };

    // Auto-generate db_name from label if user hasn't manually edited it
    if (key === 'label' && autoDbName) {
      updated.db_name = toDbName(value);
    }
    if (key === 'db_name') {
      setAutoDbName(false);
      updated.db_name = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    }

    onChange(index, updated);
  }, [field, index, onChange, autoDbName]);

  const handleAddOption = useCallback(() => {
    const trimmed = optionInput.trim();
    if (!trimmed || field.options.includes(trimmed)) return;
    update('options', [...field.options, trimmed]);
    setOptionInput('');
  }, [optionInput, field.options, update]);

  const handleRemoveOption = useCallback((opt) => {
    update('options', field.options.filter(o => o !== opt));
  }, [field.options, update]);

  const handleOptionKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  }, [handleAddOption]);

  const showOptions = NEEDS_OPTIONS.includes(field.widget);

  return (
    <div className='cd-field-editor'>
      <div className='cd-field-editor__header'>
        <span className='cd-field-editor__number'>#{index + 1}</span>
        <div className='cd-field-editor__move'>
          <button type='button' onClick={() => onMove(index, -1)} disabled={isFirst}
            className='cd-field-editor__move-btn' title='Move up'>↑</button>
          <button type='button' onClick={() => onMove(index, 1)} disabled={isLast}
            className='cd-field-editor__move-btn' title='Move down'>↓</button>
        </div>
        <button type='button' onClick={() => onRemove(index)}
          className='cd-field-editor__remove' title='Remove field'>✕</button>
      </div>

      <div className='cd-field-editor__body'>
        {/* Row 1: Label + DB Name */}
        <div className='cd-field-editor__row'>
          <div className='cd-field-editor__col'>
            <label>Label</label>
            <input type='text' value={field.label} placeholder='Artist Name'
              onChange={(e) => update('label', e.target.value)}
              className='cd-builder__input' />
          </div>
          <div className='cd-field-editor__col'>
            <label>DB column</label>
            <input type='text' value={field.db_name} placeholder='artist_name'
              onChange={(e) => update('db_name', e.target.value)}
              className='cd-builder__input' />
          </div>
        </div>

        {/* Row 2: Widget + Column + Group */}
        <div className='cd-field-editor__row'>
          <div className='cd-field-editor__col'>
            <label>Type</label>
            <select value={field.widget} onChange={(e) => update('widget', e.target.value)}
              className='cd-builder__select'>
              {WIDGET_TYPES.map(wt => (
                <option key={wt.value} value={wt.value}>{wt.label}</option>
              ))}
            </select>
          </div>
          <div className='cd-field-editor__col'>
            <label>Column</label>
            <select value={field.column} onChange={(e) => update('column', e.target.value)}
              className='cd-builder__select'>
              {COLUMN_OPTIONS.map(co => (
                <option key={co.value} value={co.value}>{co.label}</option>
              ))}
            </select>
          </div>
          <div className='cd-field-editor__col'>
            <label>Group</label>
            <select value={field.group} onChange={(e) => update('group', e.target.value)}
              className='cd-builder__select'>
              {groupNames.map(gn => (
                <option key={gn} value={gn}>{gn}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Toggles */}
        <div className='cd-field-editor__toggles'>
          <label className='cd-field-editor__toggle'>
            <input type='checkbox' checked={field.required}
              onChange={(e) => update('required', e.target.checked)} />
            <span>Required</span>
          </label>
          <label className='cd-field-editor__toggle'>
            <input type='checkbox' checked={field.searchable}
              onChange={(e) => update('searchable', e.target.checked)} />
            <span>Searchable / Filterable</span>
          </label>
        </div>

        {/* Options editor (for select, checkboxes, radio) */}
        {showOptions && (
          <div className='cd-field-editor__options'>
            <label>Options</label>
            <div className='cd-field-editor__options-list'>
              {field.options.map((opt, i) => (
                <span key={i} className='cd-field-editor__option-tag'>
                  {opt}
                  <button type='button' onClick={() => handleRemoveOption(opt)}
                    className='cd-field-editor__option-remove'>✕</button>
                </span>
              ))}
            </div>
            <div className='cd-field-editor__option-add'>
              <input type='text' value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onKeyDown={handleOptionKeyDown}
                placeholder='Type option and press Enter'
                className='cd-builder__input cd-builder__input--sm' />
              <button type='button' onClick={handleAddOption}
                className='button button-secondary'>Add</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldEditor;
