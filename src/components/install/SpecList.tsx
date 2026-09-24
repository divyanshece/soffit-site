import clsx from "clsx";
import { annotation } from "@/components/site/type";

/**
 * The build's particulars as dimension annotations: a leader with end ticks,
 * a label, a value — the way a drawing notes a measurement in its margin.
 *
 * Wide: right-aligned in a margin column, one per line.
 * Narrow: a two-column list, label left and value right, leaders dropped.
 */
export interface Spec {
  label: string;
  value: string;
  /** Tabular figures for values that are numbers. */
  numeric?: boolean;
}

export function SpecList({ specs, className }: { specs: readonly Spec[]; className?: string }) {
  return (
    <dl className={clsx(annotation, className)}>
      {specs.map((s) => (
        <div
          key={s.label}
          className="flex items-baseline justify-between gap-3 border-b border-hair py-2.5 first:border-t lg:justify-end lg:border-0 lg:first:border-t-0 lg:py-0 lg:[&+&]:mt-4"
        >
          <span aria-hidden="true" className="relative hidden h-px w-16 flex-none self-center bg-leader lg:block">
            <span className="absolute -top-0.5 left-0 h-[5px] w-px bg-leader" />
            <span className="absolute -top-0.5 right-0 h-[5px] w-px bg-leader" />
          </span>
          <dt className="text-ink-3">{s.label}</dt>
          <dd className={clsx("text-ink lg:min-w-0", s.numeric && "tnum")}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
