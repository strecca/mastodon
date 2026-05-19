// app/javascript/flavours/glitch/features/community_directory/admin/templates.js
//
// Built-in and user-saved form templates for the Community Directory builder.
// User templates persist in localStorage under CD_STORAGE_KEY.

const CD_STORAGE_KEY = 'cd_form_templates';

// ── Built-in templates ─────────────────────────────────────────────────────

export const BUILTIN_TEMPLATES = [
  {
    id:      'basic_info',
    name:    'Basic Info',
    builtin: true,
    groups: [
      { name: 'basic', label: 'Basic Information', columns: 2 },
    ],
    fields: [
      {
        db_name:        'category',
        label:          'Category',
        placeholder:    '',
        widget:         'checkboxes',
        required:       true,
        searchable:     true,
        show_in_list:   true,
        show_in_detail: true,
        options:        [],   // intentionally empty — admin fills these per-category
        column:         'full',
        group:          'basic',
      },
      {
        db_name:        'location_town_city',
        label:          'Location Town/City',
        placeholder:    'e.g. Your Town',
        widget:         'text',
        required:       true,
        searchable:     true,
        show_in_list:   true,
        show_in_detail: true,
        options:        [],
        column:         'full',
        group:          'basic',
      },
      {
        db_name:        'first_name',
        label:          'First Name',
        placeholder:    '',
        widget:         'text',
        required:       true,
        searchable:     false,
        show_in_list:   true,
        show_in_detail: true,
        options:        [],
        column:         '1',
        group:          'basic',
      },
      {
        db_name:        'last_name',
        label:          'Last Name',
        placeholder:    '',
        widget:         'text',
        required:       true,
        searchable:     true,
        show_in_list:   true,
        show_in_detail: true,
        options:        [],
        column:         '2',
        group:          'basic',
      },
      {
        db_name:        'description',
        label:          'Description',
        placeholder:    'Brief description of yourself and what you offer.',
        widget:         'textarea',
        required:       true,
        searchable:     false,
        show_in_list:   false,
        show_in_detail: true,
        options:        [],
        column:         'full',
        group:          'basic',
      },
      {
        db_name:        'hours_schedule',
        label:          'Hours/Schedule',
        placeholder:    'e.g. Mon–Fri 9am–5pm',
        widget:         'text',
        required:       false,
        searchable:     false,
        show_in_list:   false,
        show_in_detail: true,
        options:        [],
        column:         'full',
        group:          'basic',
      },
      {
        db_name:        'contact_info_1',
        label:          'Contact Info #1',
        placeholder:    'Email, phone, or social handle',
        widget:         'text',
        required:       true,
        searchable:     false,
        show_in_list:   false,
        show_in_detail: true,
        options:        [],
        column:         'full',
        group:          'basic',
      },
      {
        db_name:        'contact_info_2',
        label:          'Contact Info #2',
        placeholder:    'Another way to contact you',
        widget:         'text',
        required:       false,
        searchable:     false,
        show_in_list:   false,
        show_in_detail: true,
        options:        [],
        column:         'full',
        group:          'basic',
      },
      {
        db_name:        'website',
        label:          'Website',
        placeholder:    'https://',
        widget:         'url',
        required:       false,
        searchable:     false,
        show_in_list:   false,
        show_in_detail: true,
        options:        [],
        column:         'full',
        group:          'basic',
      },
      {
        db_name:        'telephone',
        label:          'Telephone',
        placeholder:    '',
        widget:         'number',
        required:       false,
        searchable:     false,
        show_in_list:   true,
        show_in_detail: true,
        options:        [],
        column:         'full',
        group:          'basic',
      },
    ],
  },
];

// ── localStorage persistence ───────────────────────────────────────────────

export const loadUserTemplates = () => {
  try {
    const raw = localStorage.getItem(CD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Save or overwrite a user template by name. Returns the updated list.
export const saveUserTemplate = (name, fields, groups) => {
  const id      = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const payload = {
    id,
    name,
    builtin: false,
    // Strip internal _isExisting flag before persisting
    fields:  fields.map(({ _isExisting, ...f }) => ({ ...f })),
    groups:  Array.isArray(groups) ? groups : [],
  };
  const existing = loadUserTemplates().filter(t => t.id !== id);
  const updated  = [payload, ...existing];
  try {
    localStorage.setItem(CD_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
  return updated;
};

export const deleteUserTemplate = (id) => {
  const updated = loadUserTemplates().filter(t => t.id !== id);
  try {
    localStorage.setItem(CD_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
};
