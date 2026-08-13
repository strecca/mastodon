import { useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

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

export const WelcomeDigestModal: React.FC<WelcomeDigestModalProps> = ({
  content,
  onClose,
}) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      dispatch(markWelcomeDigestRead());
      onClose();
    },
    [dispatch, onClose],
  );

  return (
    <ModalShell onSubmit={handleSubmit}>
      <ModalShellBody>
        <h1>
          <FormattedMessage
            id='welcome_digest.title'
            defaultMessage='Welcome back!'
          />
        </h1>
        <p>{content}</p>
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
