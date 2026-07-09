import { useSiteContent } from 'flavours/glitch/hooks/useSiteContent';

const ClosedRegistrationsModal = () => {
  const sc = useSiteContent();

  return (
    <div className='modal-root__modal interaction-modal'>
      <div className='interaction-modal__lead'>
        <img
          src='/miacivezza-sun-small.png'
          alt='Mia Civezza'
          style={{ width: '100%', maxWidth: '220px', height: 'auto', display: 'block', margin: '0 auto 16px' }}
        />
        <h3>{sc('join_modal_title', 'Signing up on MiaCivezza.com')}</h3>
        <p>{sc('join_modal_preamble', 'Create a free account to post, connect with neighbours, and participate in community events.')}</p>
      </div>

      <div className='interaction-modal__choices'>
        <div className='interaction-modal__choices__choice'>
          <a href='/auth/sign_up' className='button button--block'>
            {sc('join_modal_signup_btn', 'Sign up here right now!')}
          </a>
          <a href='/community' className='button button--block button-secondary' style={{ marginTop: '8px' }}>
            {sc('join_modal_explore_btn', 'Explore the Community')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ClosedRegistrationsModal;
