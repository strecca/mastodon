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

const FieldEditor = ({ index, field, groupNames, onChange, onRemove, onMove, isFirst, isLast, isExisting }) => {
  const [optionInput, setOptionInput] = useState('');
  // For existing DB columns, never auto-generate db_name from label
  const [autoDbName, setAutoDbName] = useState(!isExisting);

  const update = useCallback((key, value) => {
    const updated = { ...field, [key]: value };

    if (key === 'label' && autoDbName && !isExisting) {
      updated.db_name = toDbName(value);
    }
    if (key === 'db_name' && !isExisting) {
      setAutoDbName(false);
      updated.db_name = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    }

    onChange(index, updated);
  }, [field, index, onChange, autoDbName, isExisting]);

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
    <div className={`cd-field-editor${isExisting ? ' cd-field-editor--existing' : ''}`}>
      <div className='cd-field-editor__header'>
        <span className='cd-field-editor__number'>#{index + 1}</span>
        {isExisting && <span className='cd-field-editor__lock-badge'>existing column</span>}
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
            <label>DB column{isExisting && <span className='cd-field-editor__locked'> (locked)</span>}</label>
            <input type='text' value={field.db_name} placeholder='artist_name'
              onChange={(e) => update('db_name', e.target.value)}
              className='cd-builder__input'
              readOnly={isExisting} disabled={isExisting} />
          </div>
        </div>

        {/* Row 2: Placeholder */}
        <div className='cd-field-editor__row'>
          <div className='cd-field-editor__col cd-field-editor__col--full'>
            <label>Placeholder text</label>
            <input type='text' value={field.placeholder || ''}
              placeholder='Hint shown inside the input (optional)'
              onChange={(e) => update('placeholder', e.target.value)}
              className='cd-builder__input' />
          </div>
        </div>

        {/* Row 3: Widget + Column + Group */}
        <div className='cd-field-editor__row'>
          <div className='cd-field-editor__col'>
            <label>Type{isExisting && <span className='cd-field-editor__locked'> (locked)</span>}</label>
            <select value={field.widget} onChange={(e) => update('widget', e.target.value)}
              className='cd-builder__select' disabled={isExisting}>
              {WIDGET_TYPES.map(wt => (
                <option key={wt.value} value={wt.value}>{wt.label}</option>
              ))}
            </select>
          </div>
          <div className='cd-field-editor__col'>
            <label>Column</label>
            <select value={field.column || 'full'} onChange={(e) => update('column', e.target.value)}
              className='cd-builder__select'>
              {COLUMN_OPTIONS.map(co => (
                <option key={co.value} value={co.value}>{co.label}</option>
              ))}
            </select>
          </div>
          <div className='cd-field-editor__col'>
            <label>Group</label>
            <select value={field.group || 'default'} onChange={(e) => update('group', e.target.value)}
              className='cd-builder__select'>
              {groupNames.map(gn => (
                <option key={gn} value={gn}>{gn}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Toggles */}
        <div className='cd-field-editor__toggles'>
          <label className='cd-field-editor__toggle'>
            <input type='checkbox' checked={!!field.required}
              onChange={(e) => update('required', e.target.checked)} />
            <span>Required</span>
          </label>
          <label className='cd-field-editor__toggle'>
            <input type='checkbox' checked={!!field.searchable}
              onChange={(e) => update('searchable', e.target.checked)} />
            <span>Searchable</span>
          </label>
          <label className='cd-field-editor__toggle'>
            <input type='checkbox' checked={field.show_in_list !== false}
              onChange={(e) => update('show_in_list', e.target.checked)} />
            <span>Show in list</span>
          </label>
          <label className='cd-field-editor__toggle'>
            <input type='checkbox' checked={field.show_in_detail !== false}
              onChange={(e) => update('show_in_detail', e.target.checked)} />
            <span>Show in detail</span>
          </label>
        </div>

        {/* Options editor (for select, checkboxes, radio) */}
        {showOptions && (
          <div className='cd-field-editor__options'>
            <label>Options</label>
            <div className='cd-field-editor__options-list'>
              {(field.options || []).map((opt, i) => (
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
