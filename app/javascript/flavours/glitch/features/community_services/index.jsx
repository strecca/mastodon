import { Link } from 'react-router-dom';
import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import { useIdentity } from 'flavours/glitch/identity_context';
import config from './config.json';

const CommunityServices = ({ multiColumn }) => {
  const { signedIn } = useIdentity();
  return (
    <Column bindToDocument={!multiColumn} label={'Community Services'} className='col-services'>
      <ColumnHeader title={'Community Services'} icon='address-book' multiColumn={multiColumn} showBackButton className='ch-services' />
      {!signedIn && (
        <Link to='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#8B3E24' }}>
          Log In or Join to add your own Community Services
        </Link>
      )}
      <EntryList config={config} multiColumn={multiColumn} />
      <Helmet><title>Community Services</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityServices;
