import { useAuth } from '../lib/session.js';
import { useT } from '../i18n/index.js';
import { Modal } from './Modal.js';

// Fires 1 minute before the 30-minute idle auto-logout (see lib/session.tsx)
// when "keep me logged in" wasn't checked. Any activity elsewhere already
// resets the timer via the shared listener, but the button gives the same
// effect an explicit, discoverable action.
export function IdleWarningModal() {
  const { t } = useT();
  const { idleWarning, dismissIdleWarning } = useAuth();

  return (
    <Modal
      open={idleWarning}
      title={t('idle_modal_title')}
      tag={t('idle_modal_tag')}
      footer={
        <button type="button" className="btn btn-primary" onClick={dismissIdleWarning}>
          {t('idle_modal_stay')}
        </button>
      }
    >
      {t('idle_modal_message')}
    </Modal>
  );
}
