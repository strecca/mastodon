import { useState, useEffect, useCallback } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { withIdentity } from 'flavours/glitch/identity_context';
import { useAppDispatch, useAppSelector } from 'flavours/glitch/store';
import { fetchListing, updateListing } from 'flavours/glitch/actions/community_listings';

import { ListingForm } from '../components/listing_form';

const CommunityListingsEdit = ({ multiColumn, params }) => {
  const dispatch = useAppDispatch();
  const history  = useHistory();
  const id       = String(params?.id);

  const cached  = useAppSelector(s => s.getIn(['community_listings', 'byId', id]));
  const [loading, setLoading] = useState(!cached);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (cached) return;
    setLoading(true);
    dispatch(fetchListing(id)).finally(() => setLoading(false));
  }, [dispatch, id, cached]);

  const handleSubmit = useCallback(async (formData) => {
    setSaving(true);
    setError(null);
    try {
      await dispatch(updateListing(id, formData));
      history.push(`/community_listings/${id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong');
      setSaving(false);
    }
  }, [dispatch, id, history]);

  if (loading) return <Column><LoadingIndicator /></Column>;
  if (!cached)  return <Column><div style={{ padding: 20 }}>Listing not found.</div></Column>;

  // ListingForm expects plain JS. Swap in preview URLs so the form shows small thumbs.
  const listingJS = cached.toJS();
  const initial   = {
    ...listingJS,
    images: listingJS.image_previews?.length ? listingJS.image_previews : listingJS.images,
  };

  return (
    <Column>
      <ColumnHeader icon='tag' title='Edit Listing' multiColumn={multiColumn} />
      <Helmet><title>Edit Listing · miacivezza</title></Helmet>
      <div className='cl-form-page'>
        <Link to={`/community_listings/${id}`} className='cl-detail__back'>← Back to Listing</Link>
        <h2 className='cl-form-page__heading'>Edit Listing</h2>
        {error && <div className='cl-form-page__error'>{error}</div>}
        <ListingForm initial={initial} onSubmit={handleSubmit} saving={saving} />
      </div>
    </Column>
  );
};

export default withIdentity(CommunityListingsEdit);
