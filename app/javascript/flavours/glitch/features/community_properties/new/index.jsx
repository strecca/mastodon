import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryForm } from 'flavours/glitch/components/community_directory/entry_form';
import config from '../config.json';

const CommunityPropertiesNew = ({ multiColumn }) => {
  return (
    <Column bindToDocument={!multiColumn} label={'Add to Community Properties'}>
      <ColumnHeader title={'Add to Community Properties'} icon='plus' multiColumn={multiColumn} showBackButton />
      <EntryForm config={config} mode='create' multiColumn={multiColumn} />
      <Helmet><title>Add to Community Properties</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityPropertiesNew;
