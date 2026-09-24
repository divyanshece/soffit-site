import clsx from "clsx";
import { annotation } from "@/components/site/type";

/**
 * A dimension annotation: label, a leader with its two end ticks, and the
 * measured value — the way a drawing states a size. One per feature, and the
 * number on it is always one from the copy or the Swift source.
 *
 * On a phone the leader stretches to fill the line; from `md` it is a fixed
 * 64px, and `align="end"` hangs the whole thing off the right edge.
 */
export function Dim({
  label,
  value,
  align = "start",
  className,
}: {
  label: string;
  value: string;
  /** "end" right-aligns it from md up (for a margin column). Default "start". */
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <p
      className={clsx(
        annotation,
        "flex items-baseline gap-x-3",
        align === "end" && "md:justify-end md:text-right",
        className,
      )}
    >
      <span className="text-ink-3">{label}</span>
      <span
        aria-hidden="true"
        className={clsx(
          "relative h-px min-w-6 flex-1 self-center bg-leader md:w-16 md:flex-none",
          "before:absolute before:top-[-2px] before:left-0 before:h-[5px] before:w-px before:bg-leader",
          "after:absolute after:top-[-2px] after:right-0 after:h-[5px] after:w-px after:bg-leader",
        )}
      />
      <span className="tnum whitespace-nowrap text-ink">{value}</span>
    </p>
  );
}
