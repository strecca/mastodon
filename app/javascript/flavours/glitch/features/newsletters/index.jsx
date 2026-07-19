import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import api from 'flavours/glitch/api';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
};

const NewsletterIndex = ({ multiColumn }) => {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNewsletters = useCallback(async () => {
    try {
      const res = await api().get('/api/v1/community_newsletters');
      setNewsletters(res.data.newsletters || []);
    } catch (_) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNewsletters(); }, [fetchNewsletters]);

  return (
    <Column>
      <ColumnHeader
        label='Newsletter'
        multiColumn={multiColumn}
        showBackButton
      />

      <div className='newsletter-index scrollable'>
        <div className='newsletter-index__masthead'>
          <h1 className='newsletter-index__title'>Community Newsletter</h1>
          <p className='newsletter-index__subtitle'>
            La voce scritta della comunita di Civezza
          </p>
          <div className='newsletter-index__rule' />
        </div>

        {loading && (
          <div className='newsletter-index__loading'>Caricamento...</div>
        )}

        {!loading && newsletters.length === 0 && (
          <div className='newsletter-index__empty'>
            Nessuna newsletter pubblicata.
          </div>
        )}

        <div className='newsletter-index__grid'>
          {newsletters.map((nl) => (
            <Link
              key={nl.slug}
              to={`/newsletters/${nl.slug}`}
              className='newsletter-card'
            >
              <div className='newsletter-card__meta'>
                <span className='newsletter-card__location'>{nl.masthead_location || 'Civezza'}</span>
                <span className='newsletter-card__date'>{formatDate(nl.published_on)}</span>
              </div>
              <h2 className='newsletter-card__title'>{nl.title}</h2>
              <p className='newsletter-card__author'>
                Di <strong>{nl.author_name}</strong>
              </p>
              {nl.excerpt_it && (
                <p className='newsletter-card__excerpt'>{nl.excerpt_it}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Column>
  );
};

export default NewsletterIndex;
