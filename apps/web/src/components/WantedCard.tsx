import { Icon } from './Icon.js';
import { Stamp } from './Stamp.js';

// Wanted-poster gallery card (spec §5): archival evidence — hairline frame,
// mono metadata strip (AUTHOR / CAT / CITY), lazy image, live props count.
interface WantedCardProps {
  title: string;
  author: string;
  category: string;
  city: string;
  imageUrl?: string;
  thumbUrl?: string;
  propsCount?: number;
  onProps?: () => void;
  stamped?: boolean;
}

export function WantedCard({
  title,
  author,
  category,
  city,
  imageUrl,
  thumbUrl,
  propsCount,
  onProps,
  stamped = false,
}: WantedCardProps) {
  return (
    <article className="relative break-inside-avoid border border-fog bg-concrete">
      {thumbUrl || imageUrl ? (
        <img
          src={thumbUrl ?? imageUrl}
          alt={title}
          loading="lazy"
          className="block w-full border-b border-fog"
        />
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center border-b border-fog bg-asphalt">
          <Icon name="spray-can" size={40} className="text-fog" />
          <span className="sr-only">{title}</span>
        </div>
      )}

      <div className="px-3 pt-2">
        <h3 className="font-display text-lg uppercase tracking-tight text-bone">{title}</h3>
      </div>

      <div className="label-mono flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-bone">{author}</span>
        <span>{category}</span>
        <span>{city}</span>
      </div>

      {typeof propsCount === 'number' && (
        <button
          type="button"
          onClick={onProps}
          className="label-mono flex w-full items-center justify-between border-t border-fog px-3 py-2 transition-colors hover:text-signal"
        >
          <span>PROPS</span>
          <span className={propsCount > 0 ? 'text-signal' : ''}>{propsCount}</span>
        </button>
      )}

      {stamped && <Stamp label="PROPS" className="absolute right-2 top-2" />}
    </article>
  );
}
