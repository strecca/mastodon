import { useState, useEffect, useCallback, useMemo } from 'react';

import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import api from 'flavours/glitch/api';

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
};

const QuickShareIndex = ({ multiColumn }) => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [excluded, setExcluded] = useState(() => new Set());

  useEffect(() => {
    api().get('/api/v1/community_quick_shares')
      .then((res) => setShares(res.data))
      .finally(() => setLoading(false));
  }, []);

  const posters = useMemo(() => {
    const byUsername = new Map();
    shares.forEach((s) => {
      if (!byUsername.has(s.account.username)) {
        byUsername.set(s.account.username, s.account.display_name || s.account.username);
      }
    });
    return Array.from(byUsername, ([username, displayName]) => ({ username, displayName }));
  }, [shares]);

  const togglePoster = useCallback((username) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shares.filter((s) => {
      if (excluded.has(s.account.username)) return false;
      if (q && !s.caption.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [shares, excluded, query]);

  return (
    <Column>
      <ColumnHeader icon='description' title='Barbara & David' multiColumn={multiColumn} />
      <Helmet><title>Barbara & David · miacivezza</title></Helmet>
      <div className='qs-index'>
        <div className='qs-index__controls'>
          <input
            type='text'
            className='qs-index__search'
            placeholder='Search…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {posters.length > 1 && (
            <div className='qs-index__chips'>
              {posters.map(({ username, displayName }) => (
                <button
                  key={username}
                  type='button'
                  className={`qs-index__chip${excluded.has(username) ? '' : ' qs-index__chip--active'}`}
                  onClick={() => togglePoster(username)}
                >
                  {displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p className='qs-index__empty'>Loading…</p>
        ) : visible.length === 0 ? (
          <p className='qs-index__empty'>Nothing here yet.</p>
        ) : (
          <ul className='qs-index__list'>
            {visible.map((s) => (
              <li key={s.id} className='qs-index__item'>
                <Link to={`/shared/${s.slug}`} className='qs-index__link'>
                  <span className='qs-index__item-caption'>{s.caption}</span>
                  <span className='qs-index__item-meta'>
                    {s.account.display_name || s.account.username} · {formatDate(s.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link to='/guide' className='qs-page__back'>← Back to How It Works</Link>
      </div>
    </Column>
  );
};

export default QuickShareIndex;
