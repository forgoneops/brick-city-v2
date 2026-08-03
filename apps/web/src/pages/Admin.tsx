import { useState } from 'react';
import { ModulePage } from '../components/ModulePage.js';
import { Stamp } from '../components/Stamp.js';
import { useT } from '../i18n/index.js';
import { FEATURES, type FeatureName } from '../config/features.js';

// Admin gate — stub. Includes the feature-flags list (single source:
// src/config/features.ts) and a stamp-interaction demo for approvals.
export function Admin() {
  const { t } = useT();
  const [stampedRows, setStampedRows] = useState<string[]>([]);

  const flagRows = (Object.keys(FEATURES) as FeatureName[]).map((name) => ({
    name,
    enabled: FEATURES[name],
  }));

  // Stub approval queue — demonstrates the blood-red stamp (spec §5).
  const queue = [{ id: 'queue-stub-1', label: 'PIECE SUBMISSION / WAW-044' }];

  return (
    <ModulePage title={t('admin_title')} icon="gate" tag={`${t('admin_note')} / INTERNAL`}>
      <div className="space-y-8">
        <section>
          <h2 className="label-mono mb-3">{t('admin_flags')}</h2>
          <ul className="divide-y divide-fog border border-fog">
            {flagRows.map((flag) => (
              <li
                key={flag.name}
                className="label-mono flex items-center justify-between px-3 py-2"
              >
                <span className="text-bone">{flag.name.toUpperCase()}</span>
                <span className={flag.enabled ? 'text-signal' : 'text-blood'}>
                  {flag.enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </li>
            ))}
          </ul>
          <p className="label-mono mt-2 text-fog">FLIP IN SRC/CONFIG/FEATURES.TS</p>
        </section>

        <section>
          <h2 className="label-mono mb-3">{t('admin_queue')}</h2>
          <ul className="divide-y divide-fog border border-fog">
            {queue.map((row) => (
              <li key={row.id} className="relative flex items-center justify-between px-3 py-3">
                <span className="label-mono text-bone">{row.label}</span>
                {stampedRows.includes(row.id) ? (
                  <Stamp label={t('admin_approved')} />
                ) : (
                  <button
                    className="btn"
                    onClick={() => setStampedRows((prev) => [...prev, row.id])}
                  >
                    {t('admin_approve')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ModulePage>
  );
}
