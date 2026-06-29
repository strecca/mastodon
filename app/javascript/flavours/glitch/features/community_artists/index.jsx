import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import config from './config.json';

const CommunityArtists = ({ multiColumn }) => (
  <Column bindToDocument={!multiColumn} label={'Community Artists'} className='col-artists'>
    <ColumnHeader title={'Community Artists'} icon='address-book' multiColumn={multiColumn} showBackButton className='ch-artists' />
    <EntryList config={config} multiColumn={multiColumn} />
    <Helmet><title>Community Artists</title><meta name='robots' content='noindex' /></Helmet>
  </Column>
);
export default CommunityArtists;
