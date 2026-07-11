import { useState, useEffect, useCallback } from 'react';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import api from 'flavours/glitch/api';

const formatDate = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('it-IT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

const formatDateEn = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const DailyDigest = ({ multiColumn }) => {
  const [digest,   setDigest]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [locale,   setLocale]   = useState('it');
  const [dateISO,  setDateISO]  = useState(todayISO());
  const [allDates, setAllDates] = useState([]);

  const fetchDates = useCallback(async () => {
    try {
      const res = await api().get('/api/v1/community_daily_digests');
      setAllDates(res.data.dates || []);
    } catch (_) {
      // non-fatal
    }
  }, []);

  const fetchDigest = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    setDigest(null);
    try {
      const res = await api().get(`/api/v1/community_daily_digests/${date}`);
      setDigest(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setError('no_digest');
      } else {
        setError('error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDates();
    fetchDigest(dateISO);
  }, [fetchDates, fetchDigest, dateISO]);

  const currentIndex = allDates.indexOf(dateISO);
  const prevDate = currentIndex < allDates.length - 1 ? allDates[currentIndex + 1] : null;
  const nextDate = currentIndex > 0 ? allDates[currentIndex - 1] : null;

  const content = digest
    ? (locale === 'it' ? digest.content_it : digest.content_en) || digest.content_it || digest.content_en
    : null;

  const paragraphs = content
    ? content.split(/\n+/).filter(p => p.trim().length > 0)
    : [];

  return (
    <Column>
      <ColumnHeader
        label='Notiziario'
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='daily-digest scrollable'>

        {/* Masthead */}
        <div className='daily-digest__masthead'>
          <div className='daily-digest__masthead-rule daily-digest__masthead-rule--top' />
          <div className='daily-digest__masthead-title'>
            <span className='daily-digest__masthead-name'>MiaCivezza</span>
            <span className='daily-digest__masthead-subtitle'>
              {locale === 'it' ? 'Notiziario della Comunità' : 'Community Daily'}
            </span>
          </div>
          <div className='daily-digest__masthead-rule daily-digest__masthead-rule--bottom' />

          <div className='daily-digest__masthead-meta'>
            <span className='daily-digest__date'>
              {locale === 'it' ? formatDate(dateISO) : formatDateEn(dateISO)}
            </span>

            <div className='daily-digest__locale-toggle'>
              <button
                className={`daily-digest__locale-btn${locale === 'it' ? ' active' : ''}`}
                onClick={() => setLocale('it')}
                type='button'
              >
                IT
              </button>
              <span className='daily-digest__locale-sep'>|</span>
              <button
                className={`daily-digest__locale-btn${locale === 'en' ? ' active' : ''}`}
                onClick={() => setLocale('en')}
                type='button'
              >
                EN
              </button>
            </div>
          </div>
          <div className='daily-digest__masthead-rule daily-digest__masthead-rule--thin' />
        </div>

        {/* Body */}
        <div className='daily-digest__body'>
          {loading && (
            <div className='daily-digest__loading'>
              {locale === 'it' ? 'Caricamento in corso…' : 'Loading…'}
            </div>
          )}

          {!loading && error === 'no_digest' && (
            <div className='daily-digest__empty'>
              <p className='daily-digest__empty-headline'>
                {locale === 'it'
                  ? 'Notiziario non ancora disponibile per questa data.'
                  : 'No digest available for this date yet.'}
              </p>
              <p className='daily-digest__empty-note'>
                {locale === 'it'
                  ? 'Il notiziario viene generato ogni mattina alle 7:00 ora italiana.'
                  : 'The digest is generated each morning at 7:00 AM Italy time.'}
              </p>
            </div>
          )}

          {!loading && error === 'error' && (
            <div className='daily-digest__empty'>
              <p>
                {locale === 'it'
                  ? 'Errore durante il caricamento. Riprova più tardi.'
                  : 'Error loading digest. Please try again later.'}
              </p>
            </div>
          )}

          {!loading && !error && paragraphs.length > 0 && (
            <div className='daily-digest__article'>
              {digest?.article_count > 0 && (
                <div className='daily-digest__dateline'>
                  {locale === 'it'
                    ? `IMPERIA — Basato su ${digest.article_count} eventi comunitari`
                    : `IMPERIA — Based on ${digest.article_count} community events`}
                </div>
              )}
              <div className='daily-digest__columns'>
                {paragraphs.map((p, i) => (
                  <p key={i} className='daily-digest__paragraph'>
                    {p}
                  </p>
                ))}
              </div>
              {digest?.generated_at && (
                <div className='daily-digest__footer'>
                  {locale === 'it' ? 'Generato da intelligenza artificiale · ' : 'AI-generated · '}
                  <a href='https://miacivezza.com' className='daily-digest__footer-link'>
                    miacivezza.com
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date navigation */}
        {allDates.length > 1 && (
          <div className='daily-digest__nav'>
            <button
              className='daily-digest__nav-btn'
              disabled={!prevDate}
              onClick={() => prevDate && setDateISO(prevDate)}
              type='button'
            >
              ← {locale === 'it' ? 'Precedente' : 'Previous'}
            </button>
            <span className='daily-digest__nav-label'>
              {locale === 'it' ? 'Edizioni' : 'Editions'}
            </span>
            <button
              className='daily-digest__nav-btn'
              disabled={!nextDate}
              onClick={() => nextDate && setDateISO(nextDate)}
              type='button'
            >
              {locale === 'it' ? 'Successivo' : 'Next'} →
            </button>
          </div>
        )}

      </div>
    </Column>
  );
};

export default DailyDigest;
