import { useIntl, defineMessages } from 'react-intl';
import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { EntryDetail } from 'flavours/glitch/components/community_directory/entry_detail';
import config from '../config.json';

const messages = defineMessages({
  title: { id: 'community.events.title', defaultMessage: 'Community Events' },
});

// No ColumnHeader here — the colored category banner rendered by
// EntryDetail (entry_detail.jsx) takes over that role on detail pages,
// carried over from the list page's own ColumnHeader.
const CommunityEventsShow = ({ params, multiColumn }) => {
  const intl = useIntl();
  const t = intl.formatMessage(messages.title);
  return (
    <Column bindToDocument={!multiColumn} label={t}>
      <EntryDetail config={config} entryId={params?.id} multiColumn={multiColumn} />
      <Helmet><title>{t}</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityEventsShow;
