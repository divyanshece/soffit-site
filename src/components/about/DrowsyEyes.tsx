"use client";

import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useEffect, useRef, useState } from "react";
import { EyesHero } from "@/components/surfaces/Eyes";

/**
 * About's one moment: the googly eyes, already nodding off when the page
 * arrives, and waking when the pointer comes near them.
 *
 *   drowsy   the page loads here (and the server renders this pose). A pointer
 *            anywhere else on the page does not disturb them.
 *   asleep   left drowsy for `sleepAfter` seconds on screen, they go under,
 *            settle, and the eye loop stops completely.
 *   awake    a pointer (or a tap) within `reach` px of them. From then on they
 *            are the app's eyes, run by its own stillness rule, with the delays
 *            shortened: drowsy after `drowsyAfter` s, asleep after `asleepAfter` s.
 *
 * Under reduced motion the drowsy pose is drawn and nothing else happens.
 * The sleep countdown only advances while the eyes are on screen in a visible
 * tab, and it resumes rather than restarts; the pointer listener is removed
 * once they are awake.
 */
export interface DrowsyEyesProps {
  /** Eye diameter in points (1pt = 1px here). Default 96. */
  size?: number;
  /** How close, in px from the pair's box, the pointer must come to wake them. Default 140. */
  reach?: number;
  /** Seconds of undisturbed drowsing (on screen) before they fall asleep. Default 24. */
  sleepAfter?: number;
  /** After waking: seconds of pointer stillness before the lids sag again. Default 8. */
  drowsyAfter?: number;
  /** After waking: seconds of stillness before they are asleep. Default 30. */
  asleepAfter?: number;
  className?: string;
}

type Mode = "drowsy" | "asleep" | "awake";

const LABEL: Record<Mode, string> = {
  drowsy: "Googly eyes, nodding off",
  asleep: "Googly eyes, asleep",
  awake: "Googly eyes, following the pointer",
};

export function DrowsyEyes({
  size = 96,
  reach = 140,
  sleepAfter = 24,
  drowsyAfter = 8,
  asleepAfter = 30,
  className,
}: DrowsyEyesProps) {
  const reduce = usePrefersReducedMotion();
  const [mode, setMode] = useState<Mode>("drowsy");
  const [onScreen, setOnScreen] = useState(false);
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  // Is the pair on screen, and is the tab showing?
  useEffect(() => {
    const el = box.current;
    if (!el || reduce !== false) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    const vis = () => setVisible(document.visibilityState === "visible");
    vis();
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, [reduce]);

  // Wake when the pointer comes near. Listens only until they are awake.
  useEffect(() => {
    const el = box.current;
    if (!el || reduce !== false || mode === "awake") return;
    const near = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      if (dx * dx + dy * dy <= reach * reach) setMode("awake");
    };
    window.addEventListener("pointermove", near, { passive: true });
    window.addEventListener("pointerdown", near, { passive: true });
    return () => {
      window.removeEventListener("pointermove", near);
      window.removeEventListener("pointerdown", near);
    };
  }, [mode, reach, reduce]);

  // Left drowsy long enough, on screen, they go under. The countdown is a
  // budget, not a timer: time already spent drowsing is banked, so scrolling
  // away or leaving the tab pauses it and coming back resumes where it stopped
  // rather than starting the wait over.
  const drowsed = useRef(0);
  useEffect(() => {
    if (reduce !== false || mode !== "drowsy" || !onScreen || !visible) return;
    const from = performance.now();
    const t = window.setTimeout(() => setMode("asleep"), Math.max(0, sleepAfter * 1000 - drowsed.current));
    return () => {
      window.clearTimeout(t);
      drowsed.current += performance.now() - from;
    };
  }, [mode, onScreen, visible, sleepAfter, reduce]);

  return (
    <div ref={box} data-mode={mode} className={className}>
      <EyesHero
        size={size}
        drowsy={mode === "drowsy" ? 0.45 : undefined}
        asleep={mode === "asleep"}
        drowsyAfter={drowsyAfter}
        asleepAfter={asleepAfter}
        label={LABEL[mode]}
      />
    </div>
  );
}
