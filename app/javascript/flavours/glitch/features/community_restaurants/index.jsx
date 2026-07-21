import { Helmet } from '@unhead/react/helmet';
import { useIntl, defineMessages } from 'react-intl';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';
import config from './config.json';

const messages = defineMessages({
  title: { id: 'community.restaurants.title', defaultMessage: 'Community Restaurants' },
  cta:   { id: 'community.restaurants.cta',   defaultMessage: 'Log In or Join to add your own Community Restaurants' },
});

const CommunityRestaurants = ({ multiColumn }) => {
  const intl = useIntl();
  const { signedIn } = useIdentity();
  const sc = useSiteContent();
  return (
    <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.title)} className='col-restaurants'>
      <ColumnHeader title={sc('col_restaurants_title', intl.formatMessage(messages.title))} icon='address-book' multiColumn={multiColumn} className='ch-restaurants' />
      {!signedIn && (
        <a href='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#A8302A' }}>
          {intl.formatMessage(messages.cta)}
        </a>
      )}
      <EntryList config={config} multiColumn={multiColumn} />
      <Helmet><title>{intl.formatMessage(messages.title)}</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityRestaurants;
