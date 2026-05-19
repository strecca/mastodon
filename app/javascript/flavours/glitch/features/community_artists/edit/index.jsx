import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryForm } from 'flavours/glitch/components/community_directory/entry_form';
import config from '../config.json';

const CommunityArtistsEdit = ({ params, multiColumn }) => (
  <Column bindToDocument={!multiColumn} label={'Edit — Community Artists'}>
    <ColumnHeader title={'Edit — Community Artists'} icon='pencil' multiColumn={multiColumn} showBackButton />
    <EntryForm config={config} mode='edit' entryId={params?.id} multiColumn={multiColumn} />
    <Helmet><title>Edit — Community Artists</title><meta name='robots' content='noindex' /></Helmet>
  </Column>
);
export default CommunityArtistsEdit;
