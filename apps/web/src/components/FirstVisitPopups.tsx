import { useEffect, useState } from 'react';
import { useCms } from '../lib/cms.js';
import { useT } from '../i18n/index.js';
import { Modal } from './Modal.js';

const LEGAL_KEY = 'bcm-legal-accepted-version';
const NEWS_KEY = 'bcm-news-seen-at';

// Two-step first-visit sequence: Terms (blocking — no dismiss but Accept)
// then News (dismissible), each independently re-triggered by a content
// bump (legal.version / announcement.updatedAt) rather than a one-time flag,
// so an owner editing either later re-surfaces just that one popup.
export function FirstVisitPopups() {
  const { t, locale } = useT();
  const { config } = useCms();
  const [step, setStep] = useState<'legal' | 'news' | null>(null);

  function newsIsDue(): boolean {
    if (!config) return false;
    const { announcement } = config;
    if (!announcement.enabled || !announcement.showAsPopup || !announcement.updatedAt) return false;
    return localStorage.getItem(NEWS_KEY) !== announcement.updatedAt;
  }

  useEffect(() => {
    if (!config) return;
    const acceptedVersion = Number(localStorage.getItem(LEGAL_KEY) ?? '0');
    if (config.legal.version > acceptedVersion) {
      setStep('legal');
      return;
    }
    setStep(newsIsDue() ? 'news' : null);
  }, [config]);

  function acceptLegal() {
    if (!config) return;
    localStorage.setItem(LEGAL_KEY, String(config.legal.version));
    setStep(newsIsDue() ? 'news' : null);
  }

  function dismissNews() {
    if (config?.announcement.updatedAt) {
      localStorage.setItem(NEWS_KEY, config.announcement.updatedAt);
    }
    setStep(null);
  }

  if (!config) return null;

  // Falls back to `pl` if the active locale's field is empty — not `en`,
  // since `pl` is this Service's actual governing-law language (§13 of the
  // real text) and the one guaranteed to be filled in.
  const legalText = config.legal[locale] || config.legal.pl;

  return (
    <>
      <Modal
        open={step === 'legal'}
        title={t('legal_modal_title')}
        tag={t('legal_modal_tag')}
        footer={
          <button type="button" className="btn btn-primary" onClick={acceptLegal}>
            {t('legal_modal_accept')}
          </button>
        }
      >
        {legalText}
      </Modal>

      <Modal
        open={step === 'news'}
        title={t('news_modal_title')}
        tag={t('news_modal_tag')}
        footer={
          <button type="button" className="btn btn-primary" onClick={dismissNews}>
            {t('news_modal_dismiss')}
          </button>
        }
      >
        {config.announcement.text}
      </Modal>
    </>
  );
}
