import type { KeyboardEvent } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

// SIDE ALLEY toggle: sharp rectangular track (no pill shape), signal on / fog off.
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  function toggle() {
    if (disabled) return;
    onChange(!checked);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  }

  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : 'toggle'}
      disabled={disabled}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-sm border transition-colors focus:outline-none focus-visible:border-signal disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'border-signal bg-signal/20' : 'border-fog bg-asphalt'
      }`}
    >
      <span
        className={`block h-3 w-3 rounded-sm transition-transform ${
          checked ? 'translate-x-[19px] bg-signal' : 'translate-x-1 bg-smoke'
        }`}
      />
    </button>
  );

  if (!label) return track;

  return (
    <label className="label-mono inline-flex items-center gap-2 text-bone">
      {track}
      {label}
    </label>
  );
}
