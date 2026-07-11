import { useState } from 'react';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { withIdentity } from 'flavours/glitch/identity_context';
import api from 'flavours/glitch/api';

const ContactPage = ({ identity, multiColumn }) => {
  const { signedIn, account } = identity;

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

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
      });
      setStatus('success');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Something went wrong. Please try again.';
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  const headerLabel = signedIn
    ? `Message to Admin${username ? ' — Member: @' + username : ''}`
    : 'Contact the Admin';

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
            <h2>Thank you for reaching out!</h2>
            <p>
              Your message has been received. We appreciate you taking the time
              to write to us and will get back to you as soon as possible.
            </p>
          </div>
        ) : (
          <form className='contact-page__form' onSubmit={handleSubmit}>
            {signedIn ? (
              <div className='contact-page__member-badge'>
                Sending as Member: <strong>@{username}</strong>
                {displayName && displayName !== username && (
                  <span> ({displayName})</span>
                )}
              </div>
            ) : (
              <>
                <div className='contact-page__field'>
                  <label htmlFor='contact-name'>Your name</label>
                  <input
                    id='contact-name'
                    type='text'
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder='Your name'
                    className='contact-page__input'
                  />
                </div>
                <div className='contact-page__field'>
                  <label htmlFor='contact-email'>Your email address</label>
                  <input
                    id='contact-email'
                    type='email'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder='so we can reply to you'
                    className='contact-page__input'
                  />
                </div>
              </>
            )}

            <div className='contact-page__field'>
              <label htmlFor='contact-subject'>Subject</label>
              <input
                id='contact-subject'
                type='text'
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                placeholder='What is this about?'
                className='contact-page__input'
              />
            </div>

            <div className='contact-page__field'>
              <label htmlFor='contact-message'>Message</label>
              <textarea
                id='contact-message'
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={7}
                placeholder='Write your message here...'
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
              {status === 'submitting' ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </Column>
  );
};

export default withIdentity(ContactPage);
