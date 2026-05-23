import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryForm } from 'flavours/glitch/components/community_directory/entry_form';
import config from '../config.json';

const CommunityEventsEdit = ({ params, multiColumn }) => (
  <Column bindToDocument={!multiColumn} label={'Edit — Community Events'}>
    <ColumnHeader title={'Edit — Community Events'} icon='pencil' multiColumn={multiColumn} showBackButton />
    <EntryForm config={config} mode='edit' entryId={params?.id} multiColumn={multiColumn} />
    <Helmet><title>Edit — Community Events</title><meta name='robots' content='noindex' /></Helmet>
  </Column>
);
export default CommunityEventsEdit;
