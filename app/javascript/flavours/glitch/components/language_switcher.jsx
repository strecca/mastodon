import { useState, useCallback, useRef, useEffect } from 'react';

import { createPortal } from 'react-dom';

import { useIntl } from 'react-intl';

import { useViewingLocale } from 'flavours/glitch/hooks/useViewingLocale';

const LANGUAGES = [
  { code: 'it', nativeName: 'Italiano'  },
  { code: 'en', nativeName: 'English'   },
  { code: 'fr', nativeName: 'Français'  },
  { code: 'de', nativeName: 'Deutsch'   },
  { code: 'sv', nativeName: 'Svenska'   },
  { code: 'es', nativeName: 'Español'   },
  { code: 'no', nativeName: 'Norsk'     },
  { code: 'nl', nativeName: 'Nederlands' },
];

export const LanguageSwitcher = ({ variant = 'panel' }) => {
  const { viewingLocale, setViewingLocale } = useViewingLocale();
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const accountLocale = (
    document.documentElement.lang || intl.locale || 'en'
  ).split('-')[0];

  const activeLocale = viewingLocale || accountLocale;
  const activeLang =
    LANGUAGES.find((l) => l.code === activeLocale) ||
    LANGUAGES.find((l) => l.code === 'en');

  const handleToggle = useCallback(() => {
    setOpen((wasOpen) => {
      if (!wasOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        });
      }
      return !wasOpen;
    });
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
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const dropdown = open
    ? createPortal(
        <div
          ref={panelRef}
          className='language-switcher__panel'
          role='listbox'
          aria-label='Select viewing language'
          style={dropdownStyle}
        >
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
        </div>,
        document.body,
      )
    : null;

  const trigger = (
    <div
      className={`language-switcher${variant === 'fab' ? ' language-switcher--fab' : ''}`}
    >
      <button
        ref={triggerRef}
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
      {dropdown}
    </div>
  );

  if (variant === 'fab') {
    return createPortal(trigger, document.body);
  }

  return trigger;
};
