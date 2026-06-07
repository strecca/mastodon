import { useIntl } from 'react-intl';
import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryDetail } from 'flavours/glitch/components/community_directory/entry_detail';
import config from '../config.json';

const CommunityServicesShow = ({ params, multiColumn }) => {
  return (
    <Column bindToDocument={!multiColumn} label={'Community Services'}>
      <ColumnHeader title={'Community Services'} icon='file-text-o' multiColumn={multiColumn} showBackButton />
      <EntryDetail config={config} entryId={params?.id} multiColumn={multiColumn} />
      <Helmet><title>Community Services</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityServicesShow;
