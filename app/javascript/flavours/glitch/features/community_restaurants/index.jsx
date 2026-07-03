import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';
import config from './config.json';

const CommunityRestaurants = ({ multiColumn }) => {
  const { signedIn } = useIdentity();
  const sc = useSiteContent();
  return (
    <Column bindToDocument={!multiColumn} label={'Community Restaurants'} className='col-restaurants'>
      <ColumnHeader title={sc('col_restaurants_title', 'Community Restaurants')} icon='address-book' multiColumn={multiColumn} showBackButton className='ch-restaurants' />
      {!signedIn && (
        <a href='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#A8302A' }}>
          Log In or Join to add your own Community Restaurants
        </a>
      )}
      <EntryList config={config} multiColumn={multiColumn} />
      <Helmet><title>Community Restaurants</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityRestaurants;
