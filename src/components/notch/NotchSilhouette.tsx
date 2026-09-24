"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { type NotchBox, directionSpring, notchPath, outerWidth } from "@/lib/notch";

/**
 * The black silhouette, springing between states.
 *
 * All four numbers spring independently — outer width, height, flare radius,
 * bottom radius — and the path is rebuilt from them every frame. Interpolating
 * the `d` string directly would work only while both shapes had matching
 * commands, and would move the curves' control points in straight lines rather
 * than keeping them on the corner they belong to.
 *
 * Each number picks its own spring by direction, so a shape that is growing is
 * bouncy and one that is retracting is settled, exactly as the app's panel is.
 *
 * The <svg> box is a CONSTANT: the largest state this notch can reach. Sizing
 * it from the target box was already better than animating it per frame, but it
 * still resized the element on every state change, and on the hero — which
 * performs its lap untouched — each of those counted as an unexpected layout
 * shift. `overflow: visible` means the box never clips the path, so the shape
 * simply hangs inside a box that never moves.
 */
export function NotchSilhouette({
  box,
  max,
  fill = "var(--color-surface)",
  className,
  instant = false,
}: {
  box: NotchBox;
  /** The largest box this notch can reach; the <svg> is fixed at it. */
  max?: NotchBox;
  fill?: string;
  className?: string;
  /** Jump straight to the new shape — for prefers-reduced-motion. */
  instant?: boolean;
}) {
  const biggest = max ?? box;
  const w = useMotionValue(outerWidth(box));
  const h = useMotionValue(box.height);
  const t = useMotionValue(box.top);
  const b = useMotionValue(box.bottom);

  const { width: bw, height: bh, top: bt, bottom: bb } = box;
  useEffect(() => {
    const go = (v: typeof w, to: number) => {
      if (instant) {
        v.jump(to);
        return undefined;
      }
      if (v.get() === to) return undefined;
      return animate(v, to, directionSpring(v.get(), to));
    };
    const running = [
      go(w, bw + bt * 2),
      go(h, bh),
      go(t, bt),
      go(b, bb),
    ];
    return () => running.forEach((r) => r?.stop());
  }, [bw, bh, bt, bb, w, h, t, b, instant]);

  const d = useTransform(() => notchPath(w.get(), h.get(), t.get(), b.get()));
  const left = useTransform(() => -w.get() / 2);

  return (
    <motion.svg
      aria-hidden="true"
      className={className}
      width={outerWidth(biggest)}
      height={biggest.height}
      style={{ position: "absolute", top: 0, left: "50%", x: left, overflow: "visible" }}
    >
      <motion.path d={d} fill={fill} />
    </motion.svg>
  );
}
