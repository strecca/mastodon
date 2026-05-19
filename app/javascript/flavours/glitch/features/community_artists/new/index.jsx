import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryForm } from 'flavours/glitch/components/community_directory/entry_form';
import config from '../config.json';

const CommunityArtistsNew = ({ multiColumn }) => (
  <Column bindToDocument={!multiColumn} label={'Add to Community Artists'}>
    <ColumnHeader title={'Add to Community Artists'} icon='plus' multiColumn={multiColumn} showBackButton />
    <EntryForm config={config} mode='create' multiColumn={multiColumn} />
    <Helmet><title>Add to Community Artists</title><meta name='robots' content='noindex' /></Helmet>
  </Column>
);
export default CommunityArtistsNew;
