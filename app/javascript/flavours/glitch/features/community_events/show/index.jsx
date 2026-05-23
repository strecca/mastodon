import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryDetail } from 'flavours/glitch/components/community_directory/entry_detail';
import config from '../config.json';

const CommunityEventsShow = ({ params, multiColumn }) => (
  <Column bindToDocument={!multiColumn} label={'Community Events'}>
    <ColumnHeader title={'Community Events'} icon='calendar' multiColumn={multiColumn} showBackButton />
    <EntryDetail config={config} entryId={params?.id} multiColumn={multiColumn} />
    <Helmet><title>Community Events</title><meta name='robots' content='noindex' /></Helmet>
  </Column>
);
export default CommunityEventsShow;
