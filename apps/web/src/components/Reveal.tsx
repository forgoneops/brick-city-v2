import { useEffect, useRef, useState } from 'react';

// BRIDGE-GAP scroll-reveal (spec §2 "The Ownable Motif"):
// display heading rendered as two clip-path halves that slide together
// across a permanent 2px cut when scrolled into view (300ms).
interface RevealProps {
  text: string;
  className?: string;
}

const CLIP_TOP = 'inset(0 0 calc(50% + 1px) 0)';
const CLIP_BOTTOM = 'inset(calc(50% + 1px) 0 0 0)';

export function Reveal({ text, className = '' }: RevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const half = (clip: string, offset: string) => (
    <span
      aria-hidden="true"
      className="absolute inset-0 transition-all duration-300 ease-out"
      style={{
        clipPath: clip,
        transform: inView ? 'translateX(0)' : `translateX(${offset})`,
        opacity: inView ? 1 : 0,
      }}
    >
      {text}
    </span>
  );

  return (
    <span ref={ref} className={`relative inline-block ${className}`}>
      {/* layout sizer — keeps the heading's box without painting a third copy */}
      <span className="invisible">{text}</span>
      {half(CLIP_TOP, '-0.35em')}
      {half(CLIP_BOTTOM, '0.35em')}
      <span className="sr-only">{text}</span>
    </span>
  );
}
