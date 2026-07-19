import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import api from 'flavours/glitch/api';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Render text with **heading** markers as styled headings and paragraphs
const renderBody = (text) => {
  if (!text) return null;
  return text.split(/\n+/).filter(p => p.trim()).map((para, i) => {
    const headingMatch = para.match(/^\*\*(.+?)\*\*$/);
    if (headingMatch) {
      return <h3 key={i} className='newsletter-show__section-heading'>{headingMatch[1]}</h3>;
    }
    // Inline **bold** within a paragraph
    const parts = para.split(/(\*\*[^*]+\*\*)/);
    return (
      <p key={i} className='newsletter-show__para'>
        {parts.map((part, j) => {
          const bold = part.match(/^\*\*(.+)\*\*$/);
          return bold ? <strong key={j}>{bold[1]}</strong> : part;
        })}
      </p>
    );
  });
};

const NewsletterShow = ({ multiColumn }) => {
  const { slug } = useParams();
  const [newsletter, setNewsletter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [locale, setLocale] = useState('it');

  const fetchNewsletter = useCallback(async () => {
    try {
      const res = await api().get(`/api/v1/community_newsletters/${slug}`);
      setNewsletter(res.data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchNewsletter(); }, [fetchNewsletter]);

  const leftColumn  = newsletter ? (locale === 'it' ? newsletter.left_column_it  : newsletter.left_column_en)  : '';
  const rightColumn = newsletter ? (locale === 'it' ? newsletter.right_column_it : newsletter.right_column_en) : '';
  const hasBothLocales = newsletter && newsletter.left_column_en && newsletter.left_column_it;

  return (
    <Column>
      <ColumnHeader
        label='Newsletter'
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='newsletter-show scrollable'>
        {loading && (
          <div className='newsletter-show__loading'>Caricamento...</div>
        )}

        {notFound && (
          <div className='newsletter-show__not-found'>
            <p>Newsletter non trovata.</p>
            <Link to='/newsletters'>Tutte le newsletter</Link>
          </div>
        )}

        {newsletter && (
          <article className={`newsletter-show__article newsletter-show__article--${newsletter.newsletter_template} newsletter-show__article--${newsletter.layout_variant || 'gazette'}`}>

            {/* Masthead */}
            <div className='newsletter-show__masthead'>
              <div className='newsletter-show__masthead-rule' />
              <div className='newsletter-show__masthead-meta'>
                <span className='newsletter-show__masthead-location'>
                  {newsletter.masthead_location || 'Civezza'}
                </span>
                <span className='newsletter-show__masthead-date'>
                  {formatDate(newsletter.published_on)}
                </span>
              </div>
              <h1 className='newsletter-show__title'>{newsletter.title}</h1>
              <p className='newsletter-show__byline'>
                {locale === 'it' ? 'Di' : 'By'} <strong>{newsletter.author_name}</strong>
              </p>
              <div className='newsletter-show__masthead-rule newsletter-show__masthead-rule--thin' />

              {/* Controls: locale toggle + PDF download */}
              <div className='newsletter-show__controls'>
                {hasBothLocales && (
                  <div className='newsletter-show__locale-toggle'>
                    <button
                      className={`newsletter-show__locale-btn${locale === 'it' ? ' active' : ''}`}
                      onClick={() => setLocale('it')}
                      type='button'
                    >
                      IT
                    </button>
                    <span className='newsletter-show__locale-sep'>|</span>
                    <button
                      className={`newsletter-show__locale-btn${locale === 'en' ? ' active' : ''}`}
                      onClick={() => setLocale('en')}
                      type='button'
                    >
                      EN
                    </button>
                  </div>
                )}
                <a
                  href={`/newsletters/${newsletter.slug}/pdf`}
                  className='newsletter-show__pdf-link'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Scarica PDF
                </a>
              </div>
            </div>

            {/* Two-column body */}
            {newsletter.newsletter_template === 'two_column' && leftColumn ? (
              <div className='newsletter-show__body newsletter-show__body--two-col'>
                <aside className='newsletter-show__left-col'>
                  {renderBody(leftColumn)}
                </aside>
                <div className='newsletter-show__right-col'>
                  {renderBody(rightColumn)}
                </div>
              </div>
            ) : (
              <div className='newsletter-show__body newsletter-show__body--single'>
                {renderBody(rightColumn || leftColumn)}
              </div>
            )}

            {/* Footer */}
            {newsletter.footer_attribution && (
              <footer className='newsletter-show__footer'>
                <div className='newsletter-show__footer-rule' />
                <p className='newsletter-show__footer-text'>{newsletter.footer_attribution}</p>
              </footer>
            )}
          </article>
        )}

        <div className='newsletter-show__back-link'>
          <Link to='/newsletters'>Tutte le newsletter</Link>
        </div>
      </div>
    </Column>
  );
};

export default NewsletterShow;
