import { useState } from 'react';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { withIdentity } from 'flavours/glitch/identity_context';
import { useAppSelector } from 'flavours/glitch/store';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';
import api from 'flavours/glitch/api';

const ContactPage = ({ identity, multiColumn }) => {
  const sc = useSiteContent();
  const { signedIn, accountId } = identity;
  const account = useAppSelector(state => accountId ? state.accounts.get(accountId) : null);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — real users never see/fill this
  const [renderedAt] = useState(() => Math.floor(Date.now() / 1000));

  const displayName = account?.get('display_name') || account?.get('username') || '';
  const username    = account?.get('username') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      await api().post('/api/v1/contact_message', {
        name:    signedIn ? displayName : name,
        email:   signedIn ? undefined   : email,
        subject,
        message,
        website,
        form_rendered_at: renderedAt,
      });
      setStatus('success');
    } catch (err) {
      const msg = err?.response?.data?.error || sc('contact_error_fallback', 'Something went wrong. Please try again.');
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  const headerLabel = signedIn
    ? `${sc('contact_header_signed_in', 'Message to Admin — Member:')}${username ? ' @' + username : ''}`
    : sc('contact_header_anon', 'Contact the Admin');

  return (
    <Column>
      <ColumnHeader
        label={headerLabel}
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='contact-page scrollable'>
        {status === 'success' ? (
          <div className='contact-page__success'>
            <h2>{sc('contact_success_title', 'Thank you for reaching out!')}</h2>
            <p>
              {sc('contact_success_body', 'Your message has been received. We appreciate you taking the time to write to us and will get back to you as soon as possible.')}
            </p>
          </div>
        ) : (
          <form className='contact-page__form' onSubmit={handleSubmit}>
            <div className='contact-page__hp-field' aria-hidden='true'>
              <label htmlFor='contact-website'>Website</label>
              <input
                id='contact-website'
                type='text'
                name='website'
                value={website}
                onChange={e => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete='off'
              />
            </div>
            {signedIn ? (
              <div className='contact-page__member-badge'>
                {sc('contact_sending_as', 'Sending as Member:')} <strong>@{username}</strong>
                {displayName && displayName !== username && (
                  <span> ({displayName})</span>
                )}
              </div>
            ) : (
              <>
                <div className='contact-page__field'>
                  <label htmlFor='contact-name'>{sc('contact_name_label', 'Your name')}</label>
                  <input
                    id='contact-name'
                    type='text'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder={sc('contact_name_placeholder', 'Your name')}
                    className='contact-page__input'
                  />
                </div>
                <div className='contact-page__field'>
                  <label htmlFor='contact-email'>{sc('contact_email_label', 'Your email address')}</label>
                  <input
                    id='contact-email'
                    type='email'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder={sc('contact_email_placeholder', 'so we can reply to you')}
                    className='contact-page__input'
                  />
                </div>
              </>
            )}

            <div className='contact-page__field'>
              <label htmlFor='contact-subject'>{sc('contact_subject_label', 'Subject')}</label>
              <input
                id='contact-subject'
                type='text'
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                placeholder={sc('contact_subject_placeholder', 'What is this about?')}
                className='contact-page__input'
              />
            </div>

            <div className='contact-page__field'>
              <label htmlFor='contact-message'>{sc('contact_message_label', 'Message')}</label>
              <textarea
                id='contact-message'
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={7}
                placeholder={sc('contact_message_placeholder', 'Write your message here...')}
                className='contact-page__input contact-page__textarea'
              />
            </div>

            {status === 'error' && (
              <div className='contact-page__error'>{errorMsg}</div>
            )}

            <button
              type='submit'
              className='contact-page__submit button'
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? sc('contact_submit_sending', 'Sending…') : sc('contact_submit_btn', 'Send Message')}
            </button>
          </form>
        )}
      </div>
    </Column>
  );
};

export default withIdentity(ContactPage);
