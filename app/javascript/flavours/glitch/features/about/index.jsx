import PropTypes from 'prop-types';
import { PureComponent } from 'react';

import { defineMessages, FormattedMessage } from 'react-intl';

import { Helmet } from 'react-helmet';

import ImmutablePropTypes from 'react-immutable-proptypes';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import { injectIntl } from '@/flavours/glitch/components/intl';
import { fetchServer, fetchExtendedDescription } from 'flavours/glitch/actions/server';
import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';
import { Account } from 'flavours/glitch/components/account';
import Column from 'flavours/glitch/components/column';
import { ServerHeroImage } from 'flavours/glitch/components/server_hero_image';
import { Skeleton } from 'flavours/glitch/components/skeleton';
import { LinkFooter} from 'flavours/glitch/features/ui/components/link_footer';

import { Section } from './components/section';

const AboutCTA = () => {
  const sc = useSiteContent();
  return (
    <p className='about__header__cta'>
      {sc('about_cta', 'Click this image to see MiaCivezza.com in action!')}
    </p>
  );
};

const AboutBio = () => {
  const sc = useSiteContent();
  const photoUrl = sc('about_photo_url', '');
  return (
    <div className='about__header__bio'>
      {photoUrl && (
        <img
          src={photoUrl}
          alt='About the site'
          className='about__header__bio-photo'
        />
      )}
      <p>{sc('about_bio_p1', `MiaCivezza.com is my attempt to provide an online Community Bulletin Board and Piazzetta meeting plaza. My Wife & I would meet people at dinner or aperitivo time or at artistic or musical events, make friends and then say Goodbye and want to stay in contact with them. We'd try to exchange contact information as the last process of saying "We hope to see you again".`)}</p>
      <p>{sc('about_bio_p2', 'Now Visitors and Residents have immediate access to contact each other to renew friendships and to reunite.')}</p>
    </div>
  );
};

const messages = defineMessages({
  title: { id: 'column.about', defaultMessage: 'About' },
  contactForm: { id: 'about.contact_form', defaultMessage: 'Use our contact form' },
});

const mapStateToProps = state => ({
  server: state.getIn(['server', 'server']),
  locale: state.getIn(['meta', 'locale']),
  extendedDescription: state.getIn(['server', 'extendedDescription']),
});

class About extends PureComponent {

  static propTypes = {
    server: ImmutablePropTypes.map,
    locale: ImmutablePropTypes.string,
    extendedDescription: ImmutablePropTypes.map,
    dispatch: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    multiColumn: PropTypes.bool,
  };

  componentDidMount () {
    const { dispatch } = this.props;
    dispatch(fetchServer());
    dispatch(fetchExtendedDescription());
  }

  render () {
    const { multiColumn, intl, server, extendedDescription } = this.props;
    const isLoading = server.get('isLoading');

    return (
      <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.title)}>
        <div className='scrollable about'>
          <div className='about__header'>
            {server.getIn(['thumbnail', 'url']) && (
              <Link to='/landing'>
                <ServerHeroImage blurhash={server.getIn(['thumbnail', 'blurhash'])} src={server.getIn(['thumbnail', 'url'])} srcSet={server.getIn(['thumbnail', 'versions'])?.map((value, key) => `${value} ${key.replace('@', '')}`).join(', ')} className='about__header__hero' />
                <AboutCTA />
              </Link>
            )}
            <h1>{isLoading ? <Skeleton width='10ch' /> : server.get('domain')}</h1>
            <AboutBio />
          </div>

          <div className='about__meta'>
            <div className='about__meta__column'>
              <h4><FormattedMessage id='server_banner.administered_by' defaultMessage='Administered by:' /></h4>

              <Account id={server.getIn(['contact', 'account', 'id'])} size={36} minimal />
            </div>

            <hr className='about__meta__divider' />

            <div className='about__meta__column'>
              <h4><FormattedMessage id='about.contact' defaultMessage='Contact:' /></h4>

              <Link to='/contact' className='about__mail'>
                <FormattedMessage id='about.contact_form' defaultMessage='Use our contact form' />
              </Link>
            </div>
          </div>

          <Section open title={intl.formatMessage(messages.title)}>
            {extendedDescription.get('isLoading') ? (
              <>
                <Skeleton width='100%' />
                <br />
                <Skeleton width='100%' />
                <br />
                <Skeleton width='100%' />
                <br />
                <Skeleton width='70%' />
              </>
            ) : (extendedDescription.get('content')?.length > 0 ? (
              <div
                className='prose'
                dangerouslySetInnerHTML={{ __html: extendedDescription.get('content') }}
              />
            ) : (
              <p><FormattedMessage id='about.not_available' defaultMessage='This information has not been made available on this server.' /></p>
            ))}
          </Section>

          <LinkFooter />
        </div>

        <Helmet>
          <title>{intl.formatMessage(messages.title)}</title>
          <meta name='robots' content='all' />
        </Helmet>
      </Column>
    );
  }

}

export default connect(mapStateToProps)(injectIntl(About));
