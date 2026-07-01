import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import { useIdentity } from 'flavours/glitch/identity_context';
import config from './config.json';

const CommunityProperties = ({ multiColumn }) => {
  const { signedIn } = useIdentity();
  return (
    <Column bindToDocument={!multiColumn} label={'Community Properties'} className='col-properties'>
      <ColumnHeader title={'Community Properties'} icon='address-book' multiColumn={multiColumn} showBackButton className='ch-properties' />
      {!signedIn && (
        <a href='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#8B2240' }}>
          Log In or Join to add your own Community Properties
        </a>
      )}
      <EntryList config={config} multiColumn={multiColumn} />
      <Helmet><title>Community Properties</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityProperties;
