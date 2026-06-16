import { FormattedMessage } from 'react-intl';

import ImmutablePureComponent from 'react-immutable-pure-component';
import { connect } from 'react-redux';

class ClosedRegistrationsModal extends ImmutablePureComponent {

  render () {
    return (
      <div className='modal-root__modal interaction-modal'>
        <div className='interaction-modal__lead'>
          <img src='/miacivezza-sun-small.png' alt='Mia Civezza' style={{ width: '100%', height: 'auto', display: 'block', marginBottom: '16px' }} />
          <h3><FormattedMessage id='closed_registrations_modal.title' defaultMessage='Signing up on MiaCivezza.com' /></h3>
          <p>
            <FormattedMessage
              id='closed_registrations_modal.preamble'
              defaultMessage='Create a free account to post, connect with neighbours, and participate in community events.'
            />
          </p>
        </div>

        <div className='interaction-modal__choices'>
          <div className='interaction-modal__choices__choice'>
            <a href='/auth/sign_up' className='button button--block'>
              <FormattedMessage id='closed_registrations_modal.sign_up' defaultMessage='Sign up here right now!' />
            </a>
            <a href='/community' className='button button--block button-secondary' style={{ marginTop: '8px' }}>
              <FormattedMessage id='closed_registrations_modal.explore' defaultMessage='Explore the Community' />
            </a>
          </div>
        </div>
      </div>
    );
  }

}

export default connect()(ClosedRegistrationsModal);
