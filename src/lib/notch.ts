/**
 * The notch's real geometry, taken from the app rather than guessed.
 *
 * Every number here is in points and comes from the Swift source:
 *   - NotchShape.swift      the silhouette and its two radii
 *   - LayoutMetrics.swift   the default sizes of each presentation state
 *   - NotchGeometry.swift   the measured hardware notch, 179 × 32 on a 14" MBP
 *
 * Draw at these sizes and scale the whole stage, never the numbers: a six-point
 * fillet at a guessed size is the difference between "the notch" and "a black
 * pill".
 */

export type NotchState = "collapsed" | "activity" | "expanded";

export interface NotchBox {
  /** body width, excluding the flares */
  width: number;
  height: number;
  /** the small outward flares where the shape meets the top edge */
  top: number;
  /** the larger rounded bottom corners */
  bottom: number;
}

export const HARDWARE = { width: 179, height: 32 } as const;

export const NOTCH: Record<NotchState, NotchBox> = {
  // NotchShape.collapsed carries topRadius 6, but at rest the panel is exactly
  // the hardware notch, so the flare has nothing to flare into: every frame of
  // the collapsed app (reference/notch-collapsed.png) shows straight sides
  // meeting the top edge. The flare springs in with the width.
  collapsed: { width: HARDWARE.width, height: HARDWARE.height, top: 0, bottom: 14 },
  // LayoutMetrics.default: activityExtraWidth 48, activityHeight 78
  activity: { width: HARDWARE.width + 48, height: 78, top: 6, bottom: 14 },
  // The author's own layout rather than LayoutMetrics.default (360 × 124, radii
  // 18 / 26): 360 × 162 with broad 40pt flares and 50pt corners. It is the shape
  // in every recording of the app, and the one it was designed to be seen in.
  expanded: { width: 360, height: 162, top: 40, bottom: 50 },
};

/** How far the flares reach beyond the body on each side (NotchShape.outerInset / 2). */
export const flare = (top: number) => top;

/** Full outer width of the silhouette, flares included. */
export const outerWidth = (b: NotchBox) => b.width + b.top * 2;

/**
 * The silhouette, drawn exactly as NotchShape.path(in:) draws it: a quad-curve
 * flare out of the top edge on each side, straight sides, and rounded bottom
 * corners. `w` is the OUTER width (flares included).
 */
export function notchPath(w: number, h: number, topR: number, bottomR: number): string {
  const top = Math.min(topR, w / 2, h);
  const l = top;
  const r = w - top;
  const bottom = Math.min(bottomR, h / 2, Math.max(0, (r - l) / 2));
  return [
    `M0 0`,
    `Q${l} 0 ${l} ${top}`,
    `L${l} ${h - bottom}`,
    `Q${l} ${h} ${l + bottom} ${h}`,
    `L${r - bottom} ${h}`,
    `Q${r} ${h} ${r} ${h - bottom}`,
    `L${r} ${top}`,
    `Q${r} 0 ${w} 0`,
    `Z`,
  ].join(" ");
}

/**
 * SwiftUI's `.spring(response:dampingFraction:)`, in motion's terms. mass 1.
 *
 * Every spring on the site comes through here rather than being hand-rounded,
 * so the numbers in the Swift are the numbers on the page.
 */
export const swiftSpring = (response: number, dampingFraction: number) => {
  const w = (2 * Math.PI) / response;
  return { type: "spring", stiffness: w ** 2, damping: 2 * dampingFraction * w, mass: 1 } as const;
};

/**
 * The panel that hangs off the display uses two springs, not one, and picks by
 * direction — NotchSurfaceView.swift:106: "Bouncy on the way out, settled on
 * the way back. That asymmetry is most of why it reads as a physical object
 * rather than an animation."
 *
 * Anything growing takes OPEN_SPRING; anything shrinking or hiding takes
 * CLOSE_SPRING. They must be switched together across the silhouette, the body
 * and the light, or the light lags the edge it leaks from.
 */
export const OPEN_SPRING = swiftSpring(0.24, 0.74); // NotchSurfaceView.swift:109
export const CLOSE_SPRING = swiftSpring(0.2, 1.0); // NotchSurfaceView.swift:110
/** Content landing inside a surface. NowPlayingViews.swift:69. */
export const LAND_SPRING = swiftSpring(0.32, 0.7);

/**
 * The light under the lip. It is not the shape, so it does not take the shape's
 * spring — it brightens and dims a little slower than the edge it leaks from,
 * as light does, and it must stay slower than OPEN_SPRING wherever it is used.
 */
export const LIGHT_SPRING = { stiffness: 140, damping: 28, mass: 1 } as const;

/** Pick by direction: is the value growing or shrinking? */
export const directionSpring = (from: number, to: number) => (to > from ? OPEN_SPRING : CLOSE_SPRING);

/** Hover intent defaults, from HoverIntent.swift / SoffitSettings. */
export const HOVER = {
  /** seconds the pointer must rest before the notch opens */
  dwell: 0.1,
  /** pointer speed, in pt/s, above which the dwell restarts */
  ceiling: 1100,
  /** grace before closing after the pointer leaves */
  release: 0.1,
} as const;
