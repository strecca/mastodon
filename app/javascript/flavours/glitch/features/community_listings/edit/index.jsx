import { useState, useEffect, useCallback } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { LoadingIndicator } from 'flavours/glitch/components/loading_indicator';
import { withIdentity } from 'flavours/glitch/identity_context';
import api from 'flavours/glitch/api';

import { ListingForm } from '../components/listing_form';

const CommunityListingsEdit = ({ multiColumn, params }) => {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const history = useHistory();
  const id = params?.id;

  useEffect(() => {
    api().get(`/api/v1/community_listings/${id}`)
      .then(res => {
        const d = res.data;
        // pass preview URLs as the `images` prop so the form shows small thumbs
        setListing({ ...d, images: d.image_previews?.length ? d.image_previews : d.images });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = useCallback(async (formData) => {
    setSaving(true);
    setError(null);
    try {
      await api().put(`/api/v1/community_listings/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      history.push(`/community_listings/${id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong');
      setSaving(false);
    }
  }, [id, history]);

  if (loading) return <Column><LoadingIndicator /></Column>;
  if (!listing) return <Column><div style={{ padding: 20 }}>Listing not found.</div></Column>;

  return (
    <Column>
      <ColumnHeader icon='tag' title='Edit Listing' multiColumn={multiColumn} />
      <Helmet><title>Edit Listing · miacivezza</title></Helmet>
      <div className='cl-form-page'>
        <Link to={`/community_listings/${id}`} className='cl-detail__back'>← Back to Listing</Link>
        <h2 className='cl-form-page__heading'>Edit Listing</h2>
        {error && <div className='cl-form-page__error'>{error}</div>}
        <ListingForm initial={listing} onSubmit={handleSubmit} saving={saving} />
      </div>
    </Column>
  );
};

export default withIdentity(CommunityListingsEdit);
