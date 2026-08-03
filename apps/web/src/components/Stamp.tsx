// Blood-red stencil stamp — slams onto admin approvals (200ms, spec §5).
// Render conditionally; the animation plays on mount.
interface StampProps {
  label: string;
  className?: string;
}

export function Stamp({ label, className = '' }: StampProps) {
  return (
    <span
      className={`stamp-slam pointer-events-none inline-block select-none border-2 border-blood px-3 py-1 font-display text-sm uppercase tracking-[0.14em] text-blood ${className}`}
      role="status"
    >
      {label}
    </span>
  );
}
