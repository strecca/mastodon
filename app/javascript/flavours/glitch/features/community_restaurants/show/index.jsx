import { useIntl, defineMessages } from 'react-intl';
import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryDetail } from 'flavours/glitch/components/community_directory/entry_detail';
import config from '../config.json';

const messages = defineMessages({
  title: { id: 'community.restaurants.title', defaultMessage: 'Community Restaurants' },
});

const CommunityRestaurantsShow = ({ params, multiColumn }) => {
  const intl = useIntl();
  const t = intl.formatMessage(messages.title);
  return (
    <Column bindToDocument={!multiColumn} label={t}>
      <ColumnHeader title={t} icon='file-text-o' multiColumn={multiColumn} />
      <EntryDetail config={config} entryId={params?.id} multiColumn={multiColumn} />
      <Helmet><title>{t}</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityRestaurantsShow;
