import { Icon } from './Icon.js';
import { Stamp } from './Stamp.js';

// Wanted-poster gallery card (spec §5): archival evidence — hairline frame,
// mono metadata strip (AUTHOR / CAT / COORDS), optional props stamp.
interface WantedCardProps {
  title: string;
  author: string;
  category: string;
  coords: string;
  stamped?: boolean;
}

export function WantedCard({ title, author, category, coords, stamped = false }: WantedCardProps) {
  return (
    <article className="relative border border-fog bg-concrete">
      <div className="flex aspect-[4/5] items-center justify-center border-b border-fog bg-asphalt">
        <Icon name="spray-can" size={40} className="text-fog" />
        <span className="sr-only">{title}</span>
      </div>
      <div className="label-mono flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-bone">{author}</span>
        <span>{category}</span>
        <span>{coords}</span>
      </div>
      {stamped && <Stamp label="PROPS" className="absolute right-2 top-2" />}
    </article>
  );
}
