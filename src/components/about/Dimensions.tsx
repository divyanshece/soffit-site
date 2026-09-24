import clsx from "clsx";
import { annotation } from "@/components/site/type";

/**
 * A short list of facts drawn as dimension annotations: label, a leader line
 * with end ticks, value. The old site's `.dim`, as a definition list.
 *
 * The leader stretches to fill the row below md, the way <Dim> does, so the
 * annotation reaches the content column instead of stopping in open gutter; at
 * md and up it is the fixed 64pt leader again.
 */
export interface Dimension {
  label: string;
  value: string;
}

export function Dimensions({ items, className }: { items: readonly Dimension[]; className?: string }) {
  return (
    <dl className={clsx("grid gap-3", annotation, className)}>
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-baseline gap-3">
          <dt className="w-[4.5rem] flex-none text-ink-3">{label}</dt>
          <span
            aria-hidden="true"
            className="relative h-px min-w-6 flex-1 self-center bg-leader before:absolute before:-top-[2px] before:left-0 before:h-[5px] before:w-px before:bg-leader after:absolute after:-top-[2px] after:right-0 after:h-[5px] after:w-px after:bg-leader md:w-16 md:flex-none"
          />
          <dd className="tnum text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
