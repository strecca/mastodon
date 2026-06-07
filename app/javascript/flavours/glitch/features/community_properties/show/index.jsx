import { useIntl } from 'react-intl';
import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryDetail } from 'flavours/glitch/components/community_directory/entry_detail';
import config from '../config.json';

const CommunityPropertiesShow = ({ params, multiColumn }) => {
  return (
    <Column bindToDocument={!multiColumn} label={'Community Properties'}>
      <ColumnHeader title={'Community Properties'} icon='file-text-o' multiColumn={multiColumn} showBackButton />
      <EntryDetail config={config} entryId={params?.id} multiColumn={multiColumn} />
      <Helmet><title>Community Properties</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityPropertiesShow;
