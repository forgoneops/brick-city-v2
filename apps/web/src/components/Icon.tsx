import type React from 'react';

type IconName =
  | 'logo'
  | 'home'
  | 'spray-can'
  | 'wall-brick'
  | 'pin'
  | 'zine'
  | 'lantern'
  | 'crown'
  | 'scale'
  | 'thread'
  | 'mask'
  | 'key'
  | 'gate'
  | 'drip-dot';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 24, className = '' }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    logo: (
      <>
        <path d="M4 4 h6 v6 h-6 z" />
        <path d="M14 4 h6 v6 h-6 z" />
        <path d="M4 14 h6 v6 h-6 z" />
        <path d="M14 14 h6 v6 h-6 z" />
      </>
    ),
    home: (
      <>
        <path d="M3 10 l9 -7 l9 7" />
        <path d="M6 9 v11 h12 v-11" />
        <path d="M10 21 v-6 h4 v6" />
      </>
    ),
    'spray-can': (
      <>
        <path d="M8 6 h8 v14 h-8 z" />
        <path d="M10 2 h4 v4 h-4 z" />
        <path d="M16 9 h5" />
        <path d="M17 12 h3" />
      </>
    ),
    'wall-brick': (
      <>
        <path d="M2 6 h20" />
        <path d="M2 12 h20" />
        <path d="M2 18 h20" />
        <path d="M8 6 v6" />
        <path d="M16 12 v6" />
        <path d="M12 18 v6" />
      </>
    ),
    pin: (
      <>
        <path d="M12 2 v8" />
        <path d="M8 10 h8 l-2 10 h-4 z" />
        <path d="M6 6 l4 4" />
      </>
    ),
    zine: (
      <>
        <path d="M5 3 h14 v18 h-14 z" />
        <path d="M8 7 h8" />
        <path d="M8 11 h8" />
        <path d="M8 15 h5" />
      </>
    ),
    lantern: (
      <>
        <path d="M9 4 h6 l2 4 v12 h-10 v-12 z" />
        <path d="M12 8 v8" />
        <path d="M9 12 h6" />
      </>
    ),
    crown: (
      <>
        <path d="M4 16 l4 -10 l4 6 l4 -6 l4 10 z" />
        <path d="M4 18 h16" />
      </>
    ),
    scale: (
      <>
        <path d="M12 2 v20" />
        <path d="M4 6 h16" />
        <path d="M2 6 l4 8 h8 l4 -8" />
      </>
    ),
    thread: (
      <>
        <path d="M4 6 h16" />
        <path d="M4 12 h12" />
        <path d="M4 18 h8" />
      </>
    ),
    mask: (
      <>
        <path d="M4 8 c0 -4 16 -4 16 0 v6 c0 4 -16 4 -16 0 z" />
        <path d="M9 11 h2" />
        <path d="M13 11 h2" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="12" r="4" />
        <path d="M12 12 h8" />
        <path d="M18 12 v3" />
      </>
    ),
    gate: (
      <>
        <path d="M4 4 h16 v16 h-16 z" />
        <path d="M12 4 v16" />
        <path d="M6 9 h4" />
        <path d="M14 9 h4" />
      </>
    ),
    'drip-dot': (
      <>
        <circle cx="12" cy="6" r="3" />
        <path d="M12 9 v8" />
        <path d="M12 17 l-2 4" />
      </>
    ),
  };

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
      {paths[name]}
    </svg>
  );
}
