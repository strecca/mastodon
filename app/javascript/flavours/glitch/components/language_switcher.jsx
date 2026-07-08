import { useState, useCallback, useRef, useEffect } from 'react';

import { createPortal } from 'react-dom';

import { useIntl } from 'react-intl';

import { useViewingLocale } from 'flavours/glitch/hooks/useViewingLocale';

const LANGUAGES = [
  { code: 'it', label: 'Italiano',   nativeName: 'Italiano'  },
  { code: 'en', label: 'English',    nativeName: 'English'   },
  { code: 'fr', label: 'Français',   nativeName: 'Français'  },
  { code: 'de', label: 'Deutsch',    nativeName: 'Deutsch'   },
  { code: 'sv', label: 'Svenska',    nativeName: 'Svenska'   },
  { code: 'es', label: 'Español',    nativeName: 'Español'   },
  { code: 'nb', label: 'Norsk',      nativeName: 'Norsk'     },
];

export const LanguageSwitcher = ({ variant = 'panel' }) => {
  const { viewingLocale, setViewingLocale } = useViewingLocale();
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const accountLocale = (
    document.documentElement.lang || intl.locale || 'en'
  ).split('-')[0];

  const activeLocale = viewingLocale || accountLocale;
  const activeLang =
    LANGUAGES.find((l) => l.code === activeLocale) ||
    LANGUAGES.find((l) => l.code === 'en');

  const handleToggle = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  const handleSelect = useCallback(
    (code) => {
      setViewingLocale(code === accountLocale ? null : code);
      setOpen(false);
    },
    [accountLocale, setViewingLocale],
  );

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const content = (
    <div
      className={`language-switcher${variant === 'fab' ? ' language-switcher--fab' : ''}`}
      ref={panelRef}
    >
      <button
        type='button'
        className='language-switcher__trigger'
        onClick={handleToggle}
        aria-expanded={open}
        aria-label={`Language: ${activeLang?.nativeName ?? activeLocale}. Tap to change.`}
      >
        <span className='language-switcher__globe'>🌐</span>
        <span className='language-switcher__active-label'>
          {activeLang?.nativeName ?? activeLocale.toUpperCase()}
        </span>
        {viewingLocale && (
          <span className='language-switcher__override-dot' title='Viewing language differs from your account language' />
        )}
        <span className='language-switcher__chevron' aria-hidden='true'>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className='language-switcher__panel' role='listbox' aria-label='Select viewing language'>
          <div className='language-switcher__panel-hint'>
            Viewing translations in:
          </div>
          {LANGUAGES.map(({ code, nativeName }) => (
            <button
              key={code}
              type='button'
              role='option'
              aria-selected={activeLocale === code}
              className={`language-switcher__option${
                activeLocale === code ? ' language-switcher__option--active' : ''
              }${
                code === accountLocale ? ' language-switcher__option--account' : ''
              }`}
              onClick={() => handleSelect(code)}
            >
              <span className='language-switcher__option-name'>{nativeName}</span>
              {code === accountLocale && (
                <span className='language-switcher__option-tag'>your language</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // FAB variant uses a portal so position:fixed is relative to the viewport,
  // not a transformed ancestor (Mastodon's column animations use transforms).
  if (variant === 'fab') {
    return createPortal(content, document.body);
  }

  return content;
};
