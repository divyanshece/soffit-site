"use client";

import { useEffect, useState } from "react";
import { onCopied } from "@/components/install/copied";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { NOTCH } from "@/lib/notch";

/**
 * The room acknowledges a Copy.
 *
 * When the command is copied, one bloom of light opens under the Eaves' lip and
 * settles to nothing: the app's own light for "something just happened"
 * (ChargeActivityView.swift:86-91 — "One bloom that settles — not a pulse.",
 * tint at 0.5 fading to 0 while it scales 0.5 → 2.0). Here the visitor caused
 * the event, so the page performs the app's activity contract on their action.
 *
 * 1600ms, the default Activity.duration, which is also the clock the "Copied"
 * label already runs on. The rise is 180ms linear — a lamp turns on, it does
 * not ease in — and the remaining 1420ms is the settle. It never returns to a
 * raised level and never repeats; a second copy restarts the same single bloom.
 *
 * It is one CSS animation on one element — `soffit-copy-bloom`, in globals.css
 * with the site's other one — so /install/ still ships no animation runtime and
 * still runs no animation frames of its own at rest.
 *
 * Under reduced motion it does not run at all: the global rule would collapse
 * 1600ms into a hard flash, which is worse than nothing, and the live region on
 * the button already carries the whole report.
 *
 * Place it as a sibling of <Eaves> inside the hero <Plane>, which must stay a
 * non-stacking context so the light screens onto the plane instead of painting
 * over it.
 */
export function CopyBloom() {
  const reduce = usePrefersReducedMotion();
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduce !== false) return;
    return onCopied(() => setRun((n) => n + 1));
  }, [reduce]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 h-0 overflow-x-clip overflow-y-visible"
      style={{ top: NOTCH.collapsed.height }}
    >
      {run > 0 ? (
        <div
          key={run}
          className="absolute top-0 left-1/2 mix-blend-screen"
          style={{
            width: 210,
            height: 140,
            transformOrigin: "50% 0%",
            backgroundImage: BLOOM,
            animation: "soffit-copy-bloom 1.6s both",
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * A blurred disc hung from the lip, drawn as eased gradient stops rather than a
 * filter: the same shape as the app's blurred circle, without an offscreen pass
 * on every frame of the scale. Plain rgb(), so it does not depend on color-mix.
 */
const BLOOM = (() => {
  const N = 12;
  const stops: string[] = [];
  for (let n = 0; n <= N; n++) {
    const p = n / N;
    const s = 1 - p * p * (3 - 2 * p);
    stops.push(`rgb(255 199 133 / ${(Math.pow(1 - p, 1.5) * s).toFixed(3)}) ${(p * 100).toFixed(1)}%`);
  }
  return `radial-gradient(60% 100% at 50% 0%, ${stops.join(", ")})`;
})();
