// translation_helpers.js
//
// Shared helpers for resolving translated labels, placeholders, and
// entry field values in community directory components.
//
// Field config objects are plain JS (from config.json).
// Entry objects are Immutable Maps (from Redux store via useAppSelector).

// Resolve a field label for the current locale.
// Falls back: label_<full-locale> → label_<lang> → label (English base).
export const fieldLabel = (field, locale) => {
  const lang = locale?.split('-')[0];
  return field[`label_${locale}`] || field[`label_${lang}`] || field.label;
};

// Resolve a field placeholder for the current locale.
export const fieldPlaceholder = (field, locale) => {
  const lang = locale?.split('-')[0];
  return field[`placeholder_${locale}`] || field[`placeholder_${lang}`] || field.placeholder || '';
};

// Resolve translated entry content from the translations map embedded in
// the API response. Entry is an Immutable Map; uses getIn for nested access.
// Falls back to the raw stored value if no translation exists yet.
export const translatedValue = (entry, fieldName, locale) => {
  const lang = locale?.split('-')[0];
  return (
    entry?.getIn(['translations', locale, fieldName]) ||
    entry?.getIn(['translations', lang, fieldName]) ||
    entry?.get(fieldName)
  );
};

// Resolve a translated label for one select/checkboxes/radio OPTION VALUE
// (e.g. the stored string "Medical" -> displayed "Medico" in Italian).
// The stored value in `field.options` is always the canonical/English
// string -- never translated or migrated -- this only changes what's
// displayed. Mirrors fieldLabel's fallback chain, but positional: options
// and options_<locale> are parallel arrays, same order, same length.
// Falls back to the raw stored value if no translation exists for it.
export const optionLabel = (field, rawValue, locale) => {
  const lang = locale?.split('-')[0];
  const idx = field?.options?.indexOf(rawValue);
  if (idx == null || idx < 0) return rawValue;
  return field[`options_${locale}`]?.[idx] || field[`options_${lang}`]?.[idx] || rawValue;
};
