import type React from 'react';

// Reusable centered dialog on SIDE ALLEY tokens — hairline border, sharp
// corners, one deep ambient shadow (the design system's one exception to
// "no shadows"). No backdrop-click or Escape dismiss and no close icon by
// design: every use declares its own footer action(s), so a modal without a
// dismiss button (e.g. the blocking legal popup) genuinely can't be closed
// any other way.
interface ModalProps {
  open: boolean;
  title: string;
  tag?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function Modal({ open, title, tag, children, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full max-w-lg flex-col border border-fog bg-concrete shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="border-b border-fog px-4 py-3">
          <h2 className="font-display text-xl uppercase tracking-tight text-bone">{title}</h2>
          {tag && <p className="label-mono mt-1 text-smoke">{tag}</p>}
        </div>
        <div className="overflow-y-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-bone">
          {children}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-fog px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}
