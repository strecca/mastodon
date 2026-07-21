import { Helmet } from '@unhead/react/helmet';
import { useIntl, defineMessages } from 'react-intl';
import BrushIcon from '@/material-icons/400-24px/brush.svg?react';
import { Column } from 'flavours/glitch/components/column';
import { ColumnHeader } from 'flavours/glitch/components/column_header';
import { EntryList } from 'flavours/glitch/components/community_directory/entry_list';
import { useIdentity } from 'flavours/glitch/identity_context';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';
import config from './config.json';

const messages = defineMessages({
  title: { id: 'community.artists.title', defaultMessage: 'Community Artists' },
  cta:   { id: 'community.artists.cta',   defaultMessage: 'Log In or Join to add your own Community Artists' },
});

const CommunityArtists = ({ multiColumn }) => {
  const intl = useIntl();
  const { signedIn } = useIdentity();
  const sc = useSiteContent();
  return (
    <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.title)} className='col-artists'>
      <ColumnHeader title={sc('col_artists_title', intl.formatMessage(messages.title))} icon='brush' iconComponent={BrushIcon} multiColumn={multiColumn} className='ch-artists' />
      {!signedIn && (
        <a href='/auth/sign_in' className='community-join-cta' style={{ '--cta-color': '#7A5410' }}>
          {intl.formatMessage(messages.cta)}
        </a>
      )}
      <EntryList config={config} multiColumn={multiColumn} />
      <Helmet><title>{intl.formatMessage(messages.title)}</title><meta name='robots' content='noindex' /></Helmet>
    </Column>
  );
};
export default CommunityArtists;
