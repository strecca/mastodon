import { Helmet } from '@unhead/react/helmet';
import { useIntl, defineMessages } from 'react-intl';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';
import config from './config.json';

const messages = defineMessages({
  title: { id: 'community.properties.title', defaultMessage: 'Community Properties' },
  cta:   { id: 'community.properties.cta',   defaultMessage: 'Log In or Join to add your own Community Properties' },
});

const CommunityProperties = ({ multiColumn }) => {
  const intl = useIntl();
  const { signedIn } = useIdentity();
  const sc = useSiteContent();
  return (
    <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.title)} className='col-properties'>
      <ColumnHeader title={sc('col_properties_title', intl.formatMessage(messages.title))} icon='address-book' multiColumn={multiColumn} className='ch-properties' />
      {!signedIn && (
        <a href='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#8B2240' }}>
          {intl.formatMessage(messages.cta)}
        </a>
      )}
      <EntryList config={config} multiColumn={multiColumn} />
      <Helmet><title>{intl.formatMessage(messages.title)}</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityProperties;
