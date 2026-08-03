import { useT } from '../i18n/index.js';

// Mono empty state — short, dry, never cheerful (spec §6).
export function EmptyState({ note }: { note?: string }) {
  const { t } = useT();
  return (
    <div className="flex items-center justify-center border border-dashed border-fog p-12">
      <span className="label-mono">{note ?? t('empty_state')}</span>
    </div>
  );
}
