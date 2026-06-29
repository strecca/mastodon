import { Link } from 'react-router-dom';
import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import config from './config.json';

const CommunityProperties = ({ multiColumn }) => (
  <Column bindToDocument={!multiColumn} label={'Community Properties'} className='col-properties'>
    <ColumnHeader title={'Community Properties'} icon='address-book' multiColumn={multiColumn} showBackButton />
    <Link to='/landing' className='community-category-banner'>← All Community Categories</Link>
    <EntryList config={config} multiColumn={multiColumn} />
    <Helmet><title>Community Properties</title><meta name='robots' content='noindex' /></Helmet>
  </Column>
);
export default CommunityProperties;
