import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryDetail } from 'flavours/glitch/components/community_directory/entry_detail';
import config from '../config.json';

const CommunityArtistsShow = ({ params, multiColumn }) => (
  <Column bindToDocument={!multiColumn} label={'Community Artists'}>
    <ColumnHeader title={'Community Artists'} icon='file-text-o' multiColumn={multiColumn} showBackButton />
    <EntryDetail config={config} entryId={params?.id} multiColumn={multiColumn} />
    <Helmet><title>Community Artists</title><meta name='robots' content='noindex' /></Helmet>
  </Column>
);
export default CommunityArtistsShow;
