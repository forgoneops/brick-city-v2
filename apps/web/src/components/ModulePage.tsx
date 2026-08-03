import type React from 'react';
import { Icon, type IconName } from './Icon.js';
import { Reveal } from './Reveal.js';
import { EmptyState } from './EmptyState.js';

// Shared skeleton for module pages — bridge-gap reveal heading,
// forensic mono tag, mono empty state until the module ships data.
interface ModulePageProps {
  title: string;
  icon: IconName;
  tag: string;
  children?: React.ReactNode;
}

export function ModulePage({ title, icon, tag, children }: ModulePageProps) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <Icon name={icon} className="text-smoke" />
        <h1 className="font-display text-3xl uppercase tracking-tight text-bone md:text-4xl">
          <Reveal text={title} />
        </h1>
      </div>
      <p className="label-mono mt-2 border-b border-fog pb-4">{tag}</p>
      <div className="mt-6">{children ?? <EmptyState />}</div>
    </section>
  );
}
