import { useIntl, defineMessages } from 'react-intl';
import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryForm } from 'flavours/glitch/components/community_directory/entry_form';
import config from '../config.json';

const messages = defineMessages({
  title: { id: 'community.artists.title_edit', defaultMessage: 'Edit — Community Artists' },
});

const CommunityArtistsEdit = ({ params, multiColumn }) => {
  const intl = useIntl();
  const t = intl.formatMessage(messages.title);
  return (
    <Column bindToDocument={!multiColumn} label={t}>
      <ColumnHeader title={t} icon='pencil' multiColumn={multiColumn} showBackButton />
      <EntryForm config={config} mode='edit' entryId={params?.id} multiColumn={multiColumn} />
      <Helmet><title>{t}</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityArtistsEdit;
