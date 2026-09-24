import clsx from "clsx";
import type { CSSProperties } from "react";

/**
 * The Spill's drawing, with no motion in it: the layers every Spill is made of,
 * and <SpillStatic>, a Spill that never moves, for pages where the notch only
 * hangs (Eaves). It is a server component, so a page that only needs light at
 * rest does not ship the animation runtime. See Spill.tsx for how the light is
 * built and where it may be placed — the same rules apply here.
 */

/**
 * The four light layers. They read --spill-w, --spill-i and --spill-reach from
 * their parent.
 *
 * Each layer is sized from --spill-w and then MOVED AND SCALED by transform
 * (--spill-top, --spill-scale), so a notch opening under an animated Spill
 * changes nothing about any box. The transform sits on the blended layer
 * itself, never on an ancestor: an element with mix-blend-mode blends against
 * the backdrop of its PARENT stacking context, so a transform here is safe
 * where one on the wrapper would make the light blend against transparent and
 * turn into orange paint.
 */
const LAYER_TRANSFORM =
  "translateX(-50%) translateY(var(--spill-top, 0px)) scale(var(--spill-scale, 1))";
export function SpillLayers() {
  return (
    <>
      {/* the wide, low ambient wash: where the light lands on the plane */}
      <div
        className="absolute top-0 left-1/2 mix-blend-screen"
        style={{
          transform: LAYER_TRANSFORM,
          transformOrigin: "50% 0%",
          width: "calc(var(--spill-w) * 4.4)",
          height: "calc(var(--spill-w) * 2.1 * var(--spill-reach))",
          opacity: "calc(var(--spill-i) * 0.9)",
          backgroundImage: radial("var(--color-spill-out)", 0.16, 2.2),
          ...grazing(0.5 / 4.4),
        }}
      />
      {/* the cone */}
      <div
        className="absolute top-0 left-1/2 mix-blend-screen"
        style={{
          transform: LAYER_TRANSFORM,
          transformOrigin: "50% 0%",
          width: "calc(var(--spill-w) * 2.35)",
          height: "calc(var(--spill-w) * 1.3 * var(--spill-reach))",
          opacity: "var(--spill-i)",
          backgroundImage: [
            radial("var(--color-spill-hot)", 0.34, 1.6, "34% 55%"),
            radial("var(--color-spill)", 0.3, 1.5),
          ].join(","),
          ...grazing(0.5 / 2.35),
        }}
      />
      {/* the hot core, right under the lip */}
      <div
        className="absolute top-0 left-1/2 mix-blend-screen"
        style={{
          transform: LAYER_TRANSFORM,
          transformOrigin: "50% 0%",
          width: "calc(var(--spill-w) * 1.2)",
          height: "calc(var(--spill-w) * 0.46 * var(--spill-reach))",
          opacity: "var(--spill-i)",
          backgroundImage: [
            radial("var(--color-lip)", 0.5, 1.4, "38% 70%"),
            radial("var(--color-spill-hot)", 0.42, 1.2),
          ].join(","),
        }}
      />
      {/* dither: breaks the 8-bit steps in the falloff; masked to the cone */}
      <div
        className="absolute top-0 left-1/2 mix-blend-screen"
        style={{
          transform: LAYER_TRANSFORM,
          transformOrigin: "50% 0%",
          width: "calc(var(--spill-w) * 3)",
          height: "calc(var(--spill-w) * 1.7 * var(--spill-reach))",
          opacity: "calc(var(--spill-i) * 0.07)",
          backgroundImage: NOISE,
          backgroundSize: "160px 160px",
          maskImage: "radial-gradient(50% 100% at 50% 0%, #000 0%, rgb(0 0 0 / 0.6) 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(50% 100% at 50% 0%, #000 0%, rgb(0 0 0 / 0.6) 40%, transparent 100%)",
        }}
      />
    </>
  );
}

/** A Spill at rest: plain numbers, inline styles, no client code. */
export function SpillStatic({
  width = 179,
  intensity = 0.7,
  top = 0,
  radius = 14,
  reach = 1,
  lip = true,
  className,
}: {
  width?: number;
  intensity?: number;
  top?: number;
  radius?: number;
  reach?: number;
  lip?: boolean;
  className?: string;
}) {
  const id = "soffit-lip-static";
  return (
    <div
      aria-hidden="true"
      className={clsx("pointer-events-none absolute inset-x-0 h-0 overflow-x-clip overflow-y-visible", className)}
      style={{ top, "--spill-w": `${width}px`, "--spill-i": intensity, "--spill-reach": reach } as CSSProperties}
    >
      <SpillLayers />
      {lip ? (
        <div className="absolute top-0 left-1/2" style={{ transform: `translateX(${-width / 2}px)`, opacity: Math.min(1, 0.55 + 0.45 * intensity) }}>
          <svg className="absolute overflow-visible" style={{ width, height: radius + 2, top: -radius - 0.75, left: 0 }} fill="none">
            <LipDefs id={id} />
            <path d={lipPath(width, radius)} stroke="var(--color-spill-hot)" strokeOpacity={0.55} strokeWidth={4} style={{ filter: "blur(3px)" }} />
            <path d={lipPath(width, radius)} stroke={`url(#${id})`} strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

/** The notch's bottom outline — two quarter corners and the run between — with y = radius as the lip. */
export function lipPath(w: number, r: number) {
  const rr = Math.min(r, w / 2);
  return `M0.75 0 L0.75 ${r - rr} Q0.75 ${r} ${rr} ${r} L${w - rr} ${r} Q${w - 0.75} ${r} ${w - 0.75} ${r - rr} L${w - 0.75} 0`;
}

/** The lit edge's gradient: brightest along the bottom, fading up the corners. */
export function LipDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--color-lip)" stopOpacity="0.15" />
        <stop offset="0.7" stopColor="var(--color-lip)" stopOpacity="0.85" />
        <stop offset="1" stopColor="var(--color-lip)" stopOpacity="1" />
      </linearGradient>
    </defs>
  );
}

/**
 * Light leaving the lip at a grazing angle barely reaches the plane beside the
 * notch, so a layer wider than the lip must not start at full strength along
 * its whole top edge — that reads as a horizontal seam at lip height. The mask
 * keeps it full under the lip (`half` = the lip's half-width as a share of the
 * layer) and fades it in with depth everywhere else. Two mask layers, added.
 */
function grazing(half: number): CSSProperties {
  const h = `${(half * 100 * 1.25).toFixed(1)}%`;
  // Both halves of the mask are eased rather than stepped. Three stops
  // (transparent → 0.55 → opaque) put a knee in the ramp, and on the widest
  // layer that knee landed about 130px below the lip as a faint horizontal
  // band across the plane — the one thing light must never have.
  const m = [
    `radial-gradient(${h} 28% at 50% 0%, ${ramp(0, 0.62, 10, true)})`,
    `linear-gradient(to bottom, ${ramp(0, 0.4, 12)})`,
  ].join(", ");
  return { maskImage: m, WebkitMaskImage: m };
}

/**
 * A smoothstep ramp of mask stops between two positions. `invert` runs it from
 * opaque to transparent instead. Enough stops that the eye reads a gradient,
 * eased at both ends so neither meeting point shows an edge.
 */
function ramp(from: number, to: number, steps: number, invert = false): string {
  const stops: string[] = [];
  for (let n = 0; n <= steps; n++) {
    const p = n / steps;
    const eased = p * p * (3 - 2 * p);
    const a = invert ? 1 - eased : eased;
    const at = from + (to - from) * p;
    stops.push(`rgb(0 0 0 / ${a.toFixed(3)}) ${(at * 100).toFixed(1)}%`);
  }
  if (invert) stops.push("rgb(0 0 0 / 0) 100%");
  else stops.push("rgb(0 0 0 / 1) 100%");
  return stops.join(", ");
}

/**
 * An elliptical falloff hung from the top centre, with eased stops. `peak` is
 * the alpha at the lip; `k` is the exponent of the falloff (higher = tighter).
 * `size` is the ellipse's radii as a share of the layer.
 */
function radial(color: string, peak: number, k: number, size = "50% 100%"): string {
  const N = 14;
  const stops: string[] = [];
  for (let n = 0; n <= N; n++) {
    const p = n / N;
    // smooth, long-tailed falloff: (1 - p)^k, then a smoothstep so the last
    // stop meets zero with zero slope and leaves no rim
    const s = 1 - p * p * (3 - 2 * p);
    const a = peak * Math.pow(1 - p, k) * (0.35 + 0.65 * s);
    stops.push(`color-mix(in srgb, ${color} ${(a * 100).toFixed(2)}%, transparent) ${(p * 100).toFixed(1)}%`);
  }
  return `radial-gradient(${size} at 50% 0%, ${stops.join(", ")})`;
}

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 0.78  0 0 0 0 0.52  0 0 0 1.4 -0.2'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")";
