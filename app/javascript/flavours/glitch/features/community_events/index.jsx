import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import config from './config.json';

const CommunityEvents = ({ multiColumn }) => (
  <Column bindToDocument={!multiColumn} label={'Community Events'}>
    <ColumnHeader title={'Community Events'} icon='calendar' multiColumn={multiColumn} showBackButton />
    <EntryList config={config} multiColumn={multiColumn} />
    <Helmet><title>Community Events</title><meta name='robots' content='noindex' /></Helmet>
  </Column>
);
export default CommunityEvents;
