// CUTOUTS icon set — consumes the /icons.svg sprite (24px grid, 1.5px stroke,
// one intentional stencil gap per icon). See docs/bcm-design-system.md §4.
export type IconName =
  | 'spray-can'
  | 'wall-brick'
  | 'pin-folded'
  | 'zine-page'
  | 'crown-stencil'
  | 'mask'
  | 'lantern'
  | 'scale'
  | 'thread'
  | 'vault'
  | 'key'
  | 'eye-off'
  | 'gate'
  | 'drip-dot';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 24, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <use href={`/icons.svg#${name}`} />
    </svg>
  );
}
