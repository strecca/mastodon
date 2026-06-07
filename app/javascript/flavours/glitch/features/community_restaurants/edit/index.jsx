import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryForm } from 'flavours/glitch/components/community_directory/entry_form';
import config from '../config.json';

const CommunityRestaurantsEdit = ({ params, multiColumn }) => {
  return (
    <Column bindToDocument={!multiColumn} label={'Edit — Community Restaurants'}>
      <ColumnHeader title={'Edit — Community Restaurants'} icon='pencil' multiColumn={multiColumn} showBackButton />
      <EntryForm config={config} mode='edit' entryId={params?.id} multiColumn={multiColumn} />
      <Helmet><title>Edit — Community Restaurants</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityRestaurantsEdit;
