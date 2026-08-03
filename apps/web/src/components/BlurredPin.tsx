import { Icon } from './Icon.js';
import { useT } from '../i18n/index.js';

// Mystery system (spec §6): legendary spot pin, blurred for non-members,
// with a mono MEMBERS ONLY tag.
interface BlurredPinProps {
  hint?: string;
}

export function BlurredPin({ hint }: BlurredPinProps) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-fog p-12">
      <Icon name="pin-folded" size={48} className="text-smoke blur-[3px]" />
      <span className="label-mono text-signal">{t('members_only')}</span>
      {hint && <span className="label-mono">{hint}</span>}
    </div>
  );
}
