// app/javascript/flavours/glitch/features/community_directory/admin/components/form_preview.jsx
//
// Renders a read-only visual preview of the form layout as it would
// appear to users on the generated new/edit page.

const humanize = (str) => str ? str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const FormPreview = ({ fields, groups }) => {
  if (!fields || fields.length === 0) {
    return (
      <div className='cd-preview cd-preview--empty'>
        No fields added yet. Add fields above to see a preview.
      </div>
    );
  }

  // Build group map
  const groupMap = {};
  fields.forEach(field => {
    if (!field.label && !field.db_name) return; // skip empty fields
    const group = field.group || 'default';
    if (!groupMap[group]) groupMap[group] = [];
    groupMap[group].push(field);
  });

  const groupOrder = groups?.length > 0
    ? ['default', ...groups.map(g => g.name).filter(Boolean)]
    : Object.keys(groupMap);

  const groupLabels = {};
  const groupColumns = {};
  if (groups) {
    groups.forEach(g => {
      groupLabels[g.name] = g.label;
      groupColumns[g.name] = g.columns || 1;
    });
  }

  // Deduplicate group order
  const seen = new Set();
  const uniqueOrder = groupOrder.filter(g => {
    if (seen.has(g)) return false;
    seen.add(g);
    return true;
  });

  return (
    <div className='cd-preview'>
      {uniqueOrder.map(groupName => {
        const groupFields = groupMap[groupName];
        if (!groupFields || groupFields.length === 0) return null;

        const label = groupLabels[groupName] || (groupName !== 'default' ? humanize(groupName) : null);
        const cols = groupColumns[groupName] || 1;

        return (
          <div key={groupName} className='cd-preview__group'>
            {label && <div className='cd-preview__group-title'>{label}</div>}

            <div className={`cd-preview__row cd-preview__row--cols-${cols}`}>
              {groupFields.map((field, idx) => {
                const displayLabel = field.label || field.db_name || `Field ${idx + 1}`;
                const colClass = field.column === '1' ? 'cd-preview__field--col1'
                  : field.column === '2' ? 'cd-preview__field--col2'
                  : 'cd-preview__field--full';

                return (
                  <div key={idx} className={`cd-preview__field ${colClass}`}>
                    <span className='cd-preview__label'>
                      {displayLabel}
                      {field.required && <span className='cd-preview__required'> *</span>}
                      {field.searchable && <span className='cd-preview__badge cd-preview__badge--search'>filterable</span>}
                    </span>
                    <PreviewWidget field={field} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PreviewWidget = ({ field }) => {
  switch (field.widget) {
  case 'textarea':
    return <div className='cd-preview__widget cd-preview__widget--textarea' />;

  case 'select':
    return (
      <div className='cd-preview__widget cd-preview__widget--select'>
        <span>Select…</span>
        <span className='cd-preview__select-arrow'>▾</span>
        {field.options?.length > 0 && (
          <span className='cd-preview__options-count'>{field.options.length} options</span>
        )}
      </div>
    );

  case 'checkboxes':
    return (
      <div className='cd-preview__widget cd-preview__widget--checkboxes'>
        {(field.options || []).slice(0, 4).map((opt, i) => (
          <label key={i} className='cd-preview__checkbox'>
            <span className='cd-preview__checkbox-box'>☐</span> {opt}
          </label>
        ))}
        {field.options?.length > 4 && (
          <span className='cd-preview__more'>+{field.options.length - 4} more</span>
        )}
      </div>
    );

  case 'radio':
    return (
      <div className='cd-preview__widget cd-preview__widget--radio'>
        {(field.options || []).slice(0, 4).map((opt, i) => (
          <label key={i} className='cd-preview__radio'>
            <span className='cd-preview__radio-circle'>○</span> {opt}
          </label>
        ))}
        {field.options?.length > 4 && (
          <span className='cd-preview__more'>+{field.options.length - 4} more</span>
        )}
      </div>
    );

  case 'date':
    return <div className='cd-preview__widget cd-preview__widget--date'>mm/dd/yyyy</div>;

  case 'url':
    return <div className='cd-preview__widget cd-preview__widget--input'>https://</div>;

  case 'email':
    return <div className='cd-preview__widget cd-preview__widget--input'>email@example.com</div>;

  case 'number':
    return <div className='cd-preview__widget cd-preview__widget--input'>0</div>;

  default:
    return <div className='cd-preview__widget cd-preview__widget--input' />;
  }
};

export default FormPreview;
