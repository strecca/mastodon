import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import config from './config.json';

const CommunityRestaurants = ({ multiColumn }) => (
  <Column bindToDocument={!multiColumn} label={'Community Restaurants'} className='col-restaurants'>
    <ColumnHeader title={'Community Restaurants'} icon='address-book' multiColumn={multiColumn} showBackButton />
    <EntryList config={config} multiColumn={multiColumn} />
    <Helmet><title>Community Restaurants</title><meta name='robots' content='noindex' /></Helmet>
  </Column>
);
export default CommunityRestaurants;
