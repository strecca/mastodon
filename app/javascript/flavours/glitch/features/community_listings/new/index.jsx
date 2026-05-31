import { useState, useCallback } from 'react';

import { Link, useHistory } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { withIdentity } from 'flavours/glitch/identity_context';
import api from 'flavours/glitch/api';

import { ListingForm } from '../components/listing_form';

const CommunityListingsNew = ({ multiColumn }) => {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
  const history = useHistory();

  const handleSubmit = useCallback(async (formData) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api().post('/api/v1/community_listings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      history.push(`/community_listings/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong');
      setSaving(false);
    }
  }, [history]);

  return (
    <Column>
      <ColumnHeader icon='tag' title='New Listing' multiColumn={multiColumn} />
      <Helmet><title>New Listing · miacivezza</title></Helmet>
      <div className='cl-form-page'>
        <Link to='/community_listings' className='cl-detail__back'>← All Listings</Link>
        <h2 className='cl-form-page__heading'>Post a Listing</h2>
        {error && <div className='cl-form-page__error'>{error}</div>}
        <ListingForm onSubmit={handleSubmit} saving={saving} />
      </div>
    </Column>
  );
};

export default withIdentity(CommunityListingsNew);
