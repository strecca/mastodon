import { useCallback } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import PublicIcon from '@/material-icons/400-24px/public.svg?react';
import { openNavigation } from 'flavours/glitch/actions/navigation';
import { Icon } from 'flavours/glitch/components/icon';
import { useAppDispatch } from 'flavours/glitch/store';

const messages = defineMessages({
  languageAndMore: {
    id: 'navigation_bar.language_and_more',
    defaultMessage: 'Language & More Links',
  },
});

// Mobile-only, always-visible alternative entry point into the same
// drawer the hamburger icon (tabs_bar.menu, navigation_bar.tsx) opens --
// deliberately opens (never toggles/closes) since it's meant to always
// be discoverable, and gets covered by the drawer sliding over it once
// open (see nav-panel-fab CSS: z-index below .columns-area__panels__pane--overlay).
export const NavPanelFab: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const handleClick = useCallback(() => {
    dispatch(openNavigation());
  }, [dispatch]);

  return (
    <button
      type='button'
      className='nav-panel-fab'
      onClick={handleClick}
    >
      <Icon id='' icon={PublicIcon} className='nav-panel-fab__icon' />
      <span>{intl.formatMessage(messages.languageAndMore)}</span>
    </button>
  );
};
