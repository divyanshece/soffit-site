"use client";

import clsx from "clsx";
import { motion, type MotionValue, useMotionValue, useTransform } from "motion/react";
import { type CSSProperties, useEffect, useId } from "react";
import { LipDefs, lipPath, SpillLayers } from "./SpillStatic";

/**
 * The light that falls from under the notch's lip — the app icon's own idea,
 * and the only warm colour on the site. It is light, so it is ADDED to the
 * plane (mix-blend-mode: screen), never painted over it.
 *
 * Place it where the lip is: the Spill's top edge is the underside of the
 * notch. Render it AFTER the notch in the DOM: the light only ever falls below
 * the lip, so it never covers the notch body, and the lit line then sits on
 * the notch's outline instead of half under it.
 *
 * It spans the full width of its containing block (make that a full-bleed,
 * position: relative element — a <Plane> is) and centres its light on it, so the cone may be wider than a phone screen without making the page
 * pan sideways: it clips horizontally and lets the light fall freely down.
 *
 *   <Plane tone="top">
 *     …the notch…
 *     <Spill top={notchBottomPx} width={notchBodyWidthPx} radius={14 * scale} />
 *   </Plane>
 *
 * Layers, from the lip down: a lit 1.5px lip line following the notch's bottom
 * corners, a hot core (lip → spill-hot), the cone (spill-hot → spill →
 * spill-out), a wide low ambient wash, and a faint film of noise that dithers
 * the gradients so they do not band on 8-bit panels. Every gradient runs
 * through eased stops rather than two linear ones, which is most of what keeps
 * a radial falloff from reading as a disc with an edge.
 *
 * `width` and `intensity` accept a MotionValue, so a page can tie the light to
 * the notch opening without re-rendering. Nothing here animates by itself.
 *
 * NOTHING HERE ANIMATES A LAYOUT PROPERTY. The layers are laid out once at a
 * fixed base width and then moved and scaled by transform; the lit line's <svg>
 * is a constant box with only its path changing. Animating `top` and
 * `--spill-w` instead — which this did — resized the largest boxes on the page
 * every frame of the hero's lap, and since the lap runs untouched, every frame
 * counted as an unexpected layout shift.
 *
 * Do not put this, or any ancestor between it and the plane, into a stacking
 * context (z-index, opacity < 1, transform, filter, isolation, a
 * view-transition name): the blend would then happen against transparent, and
 * the light would turn into orange paint.
 */
export interface SpillProps {
  /** Width of the lip in px — the notch BODY width it falls from, flares excluded. Default 179. */
  width?: number | MotionValue<number>;
  /** 0–1. Brightness of the whole spill. 0.3 is a closed notch at rest, 1 an open one. Default 0.7. */
  intensity?: number | MotionValue<number>;
  /** Distance in px from the top of the containing block to the lip. Default 0. */
  top?: number | MotionValue<number>;
  /** Bottom corner radius of the notch in px, which the lit line follows. Default 14 (collapsed). */
  radius?: number;
  /** How far the light falls, as a multiple of the default (≈1.3 × width). Default 1. */
  reach?: number;
  /** Draw the thin lit lip line. Turn off when the notch draws its own edge. Default true. */
  lip?: boolean;
  className?: string;
}

export function Spill({
  width = 179,
  intensity = 0.7,
  top = 0,
  radius = 14,
  reach = 1,
  lip = true,
  className,
}: SpillProps) {
  const w = useLive(width);
  const i = useLive(intensity);
  const t = useLive(top);

  // The layers are laid out at this width and scaled from it, so their boxes
  // never change. It is the collapsed notch's body width, which keeps the
  // static and animated spills identical at rest.
  const scale = useTransform(w, (v) => v / SPILL_BASE);
  const topPx = useTransform(t, (v) => `${v}px`);
  const lipOpacity = useTransform(i, (v) => Math.min(1, 0.55 + 0.45 * v));
  const lineLeft = useTransform(w, (v) => -v / 2);

  return (
    <motion.div
      aria-hidden="true"
      className={clsx("pointer-events-none absolute inset-x-0 h-0 overflow-x-clip overflow-y-visible", className)}
      style={
        {
          top: 0,
          "--spill-w": `${SPILL_BASE}px`,
          "--spill-scale": scale,
          "--spill-top": topPx,
          "--spill-i": i,
          "--spill-reach": reach,
        } as unknown as CSSProperties
      }
    >
      <SpillLayers />
      {lip ? (
        <motion.div className="absolute top-0 left-1/2" style={{ x: lineLeft, y: t, opacity: lipOpacity }}>
          <LipLine width={w} radius={radius} />
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/**
 * The lit edge: the notch's bottom outline — two quarter corners and the run
 * between — stroked in lip colour, brightest along the bottom and fading up the
 * corners, with a soft halation under it. Drawn in an SVG that sits above the
 * Spill's top edge by `radius`, so y = radius is the lip.
 */
function LipLine({ width, radius }: { width: MotionValue<number>; radius: number }) {
  const r = radius;
  const id = `soffit-lip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const d = useTransform(width, (w) => lipPath(w, r));
  // A constant box wide enough for any notch, with `overflow: visible`: only
  // the path inside it changes, so the element never resizes.
  return (
    <motion.svg
      className="absolute overflow-visible"
      style={{ width: LIP_BOX, height: r + 2, top: -r - 0.75, left: 0 }}
      fill="none"
    >
      <LipDefs id={id} />
      {/* halation */}
      <motion.path d={d} stroke="var(--color-spill-hot)" strokeOpacity={0.55} strokeWidth={4} style={{ filter: "blur(3px)" }} />
      <motion.path d={d} stroke={`url(#${id})`} strokeWidth={1.5} strokeLinecap="round" />
    </motion.svg>
  );
}

/** The width the layers are laid out at; every other width is a scale of it. */
const SPILL_BASE = 179;
/** A lit line box wide enough for the widest notch the site ever draws. */
const LIP_BOX = 640;

/** A MotionValue either way: pass a MotionValue straight through, or mirror a number into one. */
function useLive(v: number | MotionValue<number>): MotionValue<number> {
  const own = useMotionValue<number>(typeof v === "number" ? v : 0);
  useEffect(() => {
    if (typeof v === "number") own.set(v);
  }, [v, own]);
  return typeof v === "number" ? own : v;
}
