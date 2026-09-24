"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * Equaliser.swift, redrawn: the little bars beside a playing track.
 *
 * Not audio-reactive, in the app or here. They are phase-offset sine waves —
 * the same four waves, at the same speeds, the app draws — ticking at 24fps.
 * The app does this because tapping the output stream to drive four bars costs
 * real CPU for nothing you could tell apart at a glance.
 *
 * Animates only while `playing`, on screen, in a visible tab, and without
 * reduced motion. Otherwise it rests at the app's own still height (0.45), which
 * is also what the server renders, so there is nothing to mismatch on hydrate.
 * Heights are written straight to the SVG, never through React state.
 */

/** One line of honest copy for anywhere the bars are explained. */
export const EQUALISER_NOTE = "The bars are four sine waves. They are not listening to anything.";

const FPS = 24;
const REST = 0.45;

export function Equaliser({
  playing,
  width = 12,
  height = 10,
  bars = 4,
  tint = "var(--color-accent)",
  className,
}: {
  /** Moves only while true — the app passes `track.isPlaying`. */
  playing: boolean;
  /** Frame in points. The player uses 12 × 10; the activity readout 13 × 12 before scaling. */
  width?: number;
  height?: number;
  /** Equaliser.swift's barCount. */
  bars?: number;
  /** Any CSS colour. The app tints them with the theme accent. */
  tint?: string;
  className?: string;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const animate = playing && !reduced;

  // Canvas maths from Equaliser.swift: bar width = spacing = w / (2n - 1).
  const pitch = width / (bars * 2 - 1);
  const restH = height * (0.25 + 0.75 * REST);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const rects = Array.from(el.querySelectorAll("rect"));

    const draw = (t: number, moving: boolean) => {
      rects.forEach((r, i) => {
        const phase = i * 1.7;
        const speed = 3.1 + i * 0.53;
        const wave = moving ? (Math.sin(t * speed + phase) + 1) / 2 : REST;
        const h = height * (0.25 + 0.75 * wave);
        r.setAttribute("y", String(height - h));
        r.setAttribute("height", String(h));
      });
    };

    if (!animate) {
      draw(0, false);
      return;
    }

    let raf = 0;
    let last = 0;
    let onScreen = true;
    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame);
      if (ms - last < 1000 / FPS - 1) return;
      last = ms;
      draw(ms / 1000, true);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (onScreen && document.visibilityState === "visible") raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      run();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", run);
    run();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
      // Settle rather than freeze mid-bounce.
      draw(0, false);
    };
  }, [animate, height, bars]);

  return (
    <svg
      ref={svg}
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: "block", overflow: "visible" }}
    >
      {Array.from({ length: bars }, (_, i) => (
        <rect
          key={i}
          x={i * pitch * 2}
          y={height - restH}
          width={pitch}
          height={restH}
          rx={pitch / 2}
          fill={tint}
        />
      ))}
    </svg>
  );
}
