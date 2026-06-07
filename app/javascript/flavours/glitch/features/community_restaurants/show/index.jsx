import { useIntl } from 'react-intl';
import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryDetail } from 'flavours/glitch/components/community_directory/entry_detail';
import config from '../config.json';

const CommunityRestaurantsShow = ({ params, multiColumn }) => {
  return (
    <Column bindToDocument={!multiColumn} label={'Community Restaurants'}>
      <ColumnHeader title={'Community Restaurants'} icon='file-text-o' multiColumn={multiColumn} showBackButton />
      <EntryDetail config={config} entryId={params?.id} multiColumn={multiColumn} />
      <Helmet><title>Community Restaurants</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityRestaurantsShow;
