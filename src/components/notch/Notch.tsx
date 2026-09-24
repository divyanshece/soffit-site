"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { type NotchBox, LAND_SPRING, NOTCH, directionSpring, type NotchState } from "@/lib/notch";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { NotchSilhouette } from "./NotchSilhouette";

/**
 * The notch: a silhouette that springs between its three states, and a body
 * that clips whatever surface is showing to the silhouette's own inner edge.
 *
 * `contentKey` identifies the surface. Changing it cross-fades one surface into
 * the next, the way the app swaps modules; changing only `state` reshapes the
 * notch around the surface that is already there.
 *
 * Content lands on a soft spring and leaves before the shape starts shrinking
 * — the app does the same, so text never gets squeezed by a silhouette that is
 * still on its way.
 *
 * NOTHING HERE ANIMATES A LAYOUT PROPERTY. The body is a fixed box at the
 * largest state this notch can reach and the shape is cut out of it with an
 * animated `clip-path`; the wrapper reserves that same height. Springing
 * `width`/`height` instead — which this component used to do — moved a box
 * sixty times a second on the page's centrepiece, and because the hero performs
 * its lap with nobody touching the page, every one of those frames counted as
 * an unexpected layout shift: the home page measured a CLS of 0.54, where 0.1
 * is the threshold for "good".
 */
export function Notch({
  state,
  box: boxOverride,
  contentKey,
  children,
  className,
}: {
  state: NotchState;
  /** Override the state's default geometry (e.g. a taller surface). */
  box?: Partial<NotchBox>;
  contentKey?: string;
  children?: ReactNode;
  className?: string;
}) {
  const box: NotchBox = { ...NOTCH[state], ...boxOverride };
  const open = state !== "collapsed";
  // Reduced motion: the notch still changes state — that is information — but it
  // arrives there at once, with no spring or slide on the way.
  const reduce = usePrefersReducedMotion();

  // The box the body reserves: the largest this notch can ever show. Held
  // constant so neither the body nor the wrapper round it ever changes size.
  const max: NotchBox = {
    width: Math.max(NOTCH.expanded.width, box.width),
    height: Math.max(NOTCH.expanded.height, box.height),
    top: Math.max(NOTCH.expanded.top, box.top),
    bottom: Math.max(NOTCH.expanded.bottom, box.bottom),
  };

  // The cut, as three springing numbers. Each picks its own spring by
  // direction — bouncy growing, settled retracting — exactly as the silhouette
  // around it does, so the edge and the shape it clips agree.
  const w = useMotionValue(box.width);
  const h = useMotionValue(box.height);
  const r = useMotionValue(box.bottom);
  const { width: bw, height: bh, bottom: bb } = box;
  useEffect(() => {
    const go = (v: typeof w, to: number) => {
      if (reduce) {
        v.jump(to);
        return undefined;
      }
      if (v.get() === to) return undefined;
      return animate(v, to, directionSpring(v.get(), to));
    };
    const running = [go(w, bw), go(h, bh), go(r, bb)];
    return () => running.forEach((a) => a?.stop());
  }, [bw, bh, bb, w, h, r, reduce]);

  const clipPath = useTransform(() => {
    const side = Math.max(0, (max.width - w.get()) / 2);
    const bottom = Math.max(0, max.height - h.get());
    const radius = r.get();
    return `inset(0px ${side}px ${bottom}px round 0px 0px ${radius}px ${radius}px)`;
  });

  return (
    <div
      className={className}
      style={{ position: "relative", width: 0, height: max.height, marginInline: "auto" }}
    >
      <NotchSilhouette box={box} max={max} instant={reduce} />
      <motion.div
        // The body: a fixed box the size of the largest state, with the current
        // shape cut out of it. Transparent to the pointer, because at rest it
        // is far larger than the collapsed notch it is showing.
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          x: "-50%",
          width: max.width,
          height: max.height,
          clipPath,
          pointerEvents: "none",
          color: "var(--color-surface-ink)",
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {open && children ? (
            <motion.div
              key={contentKey ?? state}
              // The app lands content with .opacity and .offset(y: -5) on a
              // spring and nothing else: there is no blur in any of its content
              // transitions.
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -5 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: reduce ? { duration: 0 } : LAND_SPRING,
              }}
              exit={{
                opacity: 0,
                transition: reduce ? { duration: 0 } : { duration: 0.12, ease: "easeIn" },
              }}
              // Sized to the state it is showing, not to the body: a surface
              // laid out at the body's full size would put an activity readout
              // in the wrong place. It changes size only when the state does.
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                translateX: "-50%",
                width: box.width,
                height: box.height,
                pointerEvents: "auto",
              }}
            >
              {children}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
