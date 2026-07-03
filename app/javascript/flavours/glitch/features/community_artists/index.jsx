import { Helmet } from '@unhead/react/helmet';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';
import config from './config.json';

const CommunityArtists = ({ multiColumn }) => {
  const { signedIn } = useIdentity();
  const sc = useSiteContent();
  return (
    <Column bindToDocument={!multiColumn} label={'Community Artists'} className='col-artists'>
      <ColumnHeader title={sc('col_artists_title', 'Community Artists')} icon='address-book' multiColumn={multiColumn} showBackButton className='ch-artists' />
      {!signedIn && (
        <a href='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#7A5410' }}>
          Log In or Join to add your own Community Artists
        </a>
      )}
      <EntryList config={config} multiColumn={multiColumn} />
      <Helmet><title>Community Artists</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityArtists;
