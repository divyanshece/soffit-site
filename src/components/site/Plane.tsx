import clsx from "clsx";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

/**
 * Planes are the site's sections: full-bleed bands of flat dark value, read as
 * architectural elevations. Lighter is nearer the notch; the page recedes as
 * it goes down. Separation between planes is value, and — where a hard edge is
 * wanted — the 3px shadow gap. Never a border, a card or a drop shadow.
 *
 * A Plane is only the band and its vertical rhythm. Put a <Section> inside it
 * for the content width and gutters.
 *
 * It is `position: relative` and deliberately NOT a stacking context (no
 * z-index, opacity, transform, filter or isolation), so a <Spill> inside it
 * screens its light onto the plane's own colour instead of painting over it.
 */
export type PlaneTone = "top" | "mid" | "base" | "deep";

const TONE: Record<PlaneTone, string> = {
  // the hero band: lightest at the top, where the notch is, falling to the base
  top: "bg-[linear-gradient(180deg,var(--color-plane-top)_0%,var(--color-plane-mid)_38%,var(--color-plane)_100%)]",
  mid: "bg-plane-mid",
  base: "bg-plane",
  deep: "bg-plane-deep",
};

const PAD = {
  // 64 → 96 → 128, the rhythm every plane shares
  default: "py-16 md:py-24 xl:py-32",
  // for a plane that opens under the fascia with its own drawing (a hero):
  // the page sets the top, the plane keeps the bottom
  "flush-top": "pb-16 md:pb-24 xl:pb-32",
  none: "",
} as const;

export type PlaneProps<T extends ElementType = "section"> = {
  /** Which elevation. top = the hero gradient; mid, base, deep = flat, receding. Default "base". */
  tone?: PlaneTone;
  /** The element rendered. Default "section" — give it an aria-labelledby. */
  as?: T;
  /** Vertical padding. Default "default" (64/96/128px by breakpoint). */
  pad?: keyof typeof PAD;
  /** Draw the 3px shadow gap along the top edge: 2px of black and 1px of lip light. */
  gap?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Plane<T extends ElementType = "section">({
  tone = "base",
  as,
  pad = "default",
  gap = false,
  className,
  children,
  ...rest
}: PlaneProps<T>) {
  const Tag: ElementType = as ?? "section";
  return (
    <Tag
      data-plane={tone}
      className={clsx("relative scroll-mt-6", TONE[tone], PAD[pad], className)}
      {...rest}
    >
      {gap ? <ShadowGap className="absolute inset-x-0 top-0" /> : null}
      {children}
    </Tag>
  );
}

/**
 * The only divider on the site: a 3px recessed reveal — 2px of true black and
 * 1px of lip light, as if the plane below were lit from under the one above.
 * Use it between planes, or via <Plane gap>.
 *
 * The lit line is brightest on the page's notch axis and falls to nothing at
 * the gutters, so the seam reads as a reveal with one source above it rather
 * than as a rule drawn edge to edge. Pure paint: no clock, no extra frame.
 */
export function ShadowGap({ className }: { className?: string }) {
  return (
    <div
      role="presentation"
      className={clsx(
        "h-[3px] bg-fascia bg-[linear-gradient(90deg,transparent_0%,color-mix(in_oklab,var(--color-lip)_30%,transparent)_50%,transparent_100%)] bg-[length:100%_1px] bg-bottom bg-no-repeat",
        className,
      )}
    />
  );
}
