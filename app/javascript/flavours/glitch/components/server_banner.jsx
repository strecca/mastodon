import { useEffect } from 'react';

import { FormattedMessage, useIntl, defineMessages } from 'react-intl';

import { Link } from 'react-router-dom';

import { useDispatch, useSelector } from 'react-redux';

import { fetchServer } from 'flavours/glitch/actions/server';
import { Account } from 'flavours/glitch/components/account';
import { ServerHeroImage } from 'flavours/glitch/components/server_hero_image';
import { ShortNumber } from 'flavours/glitch/components/short_number';
import { Skeleton } from 'flavours/glitch/components/skeleton';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';

const messages = defineMessages({
  aboutActiveUsers: { id: 'server_banner.about_active_users', defaultMessage: 'People using this server during the last 30 days (Monthly Active Users)' },
});

const ServerBanner = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const server = useSelector(state => state.getIn(['server', 'server']));
  const sc = useSiteContent();

  useEffect(() => {
    dispatch(fetchServer());
  }, [dispatch]);

  const isLoading = server.get('isLoading');

  return (
    <div className='server-banner'>
      <Link to='/landing'>
        <ServerHeroImage
          blurhash={server.getIn(['thumbnail', 'blurhash'])}
          src={server.getIn(['thumbnail', 'url'])}
          className='server-banner__hero'
        />
        <p className='server-banner__hero-cta'>
          {sc('server_hero_cta', 'Click this image to see MiaCivezza.com in action!')}
        </p>
      </Link>

      <div className='server-banner__description'>
        {isLoading ? (
          <>
            <Skeleton width='100%' />
            <br />
            <Skeleton width='100%' />
            <br />
            <Skeleton width='70%' />
          </>
        ) : sc('server_description', server.get('description'))}
      </div>

      <div className='server-banner__meta'>
        <div className='server-banner__meta__column'>
          <h4><FormattedMessage id='server_banner.administered_by' defaultMessage='Administered by:' /></h4>
          <Account id={server.getIn(['contact', 'account', 'id'])} size={36} minimal />
        </div>

        <div className='server-banner__meta__column'>
          <h4><FormattedMessage id='server_banner.server_stats' defaultMessage='Server stats:' /></h4>
          {isLoading ? (
            <>
              <strong className='server-banner__number'><Skeleton width='10ch' /></strong>
              <br />
              <span className='server-banner__number-label'><Skeleton width='5ch' /></span>
            </>
          ) : (
            <>
              <strong className='server-banner__number'>
                <ShortNumber value={server.getIn(['usage', 'users', 'active_month'])} />
              </strong>
              <br />
              <span
                className='server-banner__number-label'
                title={intl.formatMessage(messages.aboutActiveUsers)}
              >
                <FormattedMessage id='server_banner.active_users' defaultMessage='active users' />
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServerBanner;
