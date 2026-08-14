import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';
import { useHistory } from 'react-router-dom';

import { Button } from 'flavours/glitch/components/button';
import {
  ModalShell,
  ModalShellActions,
  ModalShellBody,
} from 'flavours/glitch/components/modal_shell';
import { markWelcomeDigestRead } from 'flavours/glitch/reducers/slices/welcome_digest';
import { useAppDispatch } from 'flavours/glitch/store';

export interface WelcomeDigestModalProps {
  content: string;
  onClose: () => void;
}

// Matches the markdown links Claude is instructed to produce, e.g.
// "[a new Restaurants listing](/community_restaurants/42)". Deliberately
// only matches relative paths (starting with /) — this content is never
// meant to link off-site, and requiring the leading slash means a malformed
// or hallucinated absolute URL renders as plain text instead of a live link.
const LINK_RE = /(\[[^\]]+\]\(\/[^)\s]+\))/g;
const LINK_MATCH_RE = /^\[([^\]]+)\]\((\/[^)\s]+)\)$/;

export const WelcomeDigestModal: React.FC<WelcomeDigestModalProps> = ({
  content,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const history = useHistory();

  const dismiss = useCallback(() => {
    dispatch(markWelcomeDigestRead());
    onClose();
  }, [dispatch, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      dismiss();
    },
    [dismiss],
  );

  // Stable reference (not recreated per link) — the target path is read off
  // the anchor's own href at click time rather than closed over per-item, so
  // this one handler covers every link in the digest.
  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const path = e.currentTarget.getAttribute('href');
      dismiss();
      if (path) history.push(path);
    },
    [dismiss, history],
  );

  const renderContent = (text: string) =>
    text.split(LINK_RE).map((part, i) => {
      const match = LINK_MATCH_RE.exec(part);
      if (!match) return part;

      const [, linkText, path] = match;
      return (
        <a key={i} href={path} onClick={handleLinkClick}>
          {linkText}
        </a>
      );
    });

  return (
    <ModalShell onSubmit={handleSubmit}>
      <ModalShellBody>
        <h1>
          <FormattedMessage
            id='welcome_digest.title'
            defaultMessage='Welcome back!'
          />
        </h1>
        <p>{renderContent(content)}</p>
      </ModalShellBody>

      <ModalShellActions>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- we are in a modal and thus autofocusing is justified */}
        <Button type='submit' autoFocus>
          <FormattedMessage id='welcome_digest.dismiss' defaultMessage='Got it' />
        </Button>
      </ModalShellActions>
    </ModalShell>
  );
};
