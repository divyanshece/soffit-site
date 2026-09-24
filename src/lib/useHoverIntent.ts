"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HOVER } from "./notch";

export type IntentPhase = "away" | "arming" | "engaged";

/**
 * HoverIntent.swift, for the web.
 *
 * The notch opens when the pointer RESTS on it, not when it merely crosses it:
 * a pointer travelling faster than `ceiling` pt/s is on its way somewhere else
 * (the Wi-Fi menu, say), so its dwell restarts. That rule is the whole reason
 * the real app doesn't pop open every time you reach for the menu bar, so the
 * demo keeps it rather than opening on plain hover.
 *
 * Speeds are in CSS pixels per second of the *stage*, which is drawn in points
 * and scaled — pass the stage's scale so a pointer crossing a shrunk stage on a
 * phone is judged by the distance it covered in points.
 *
 * `speed` is only kept as state when `trackSpeed` is set (the lab reads it).
 * Otherwise the pointer's speed stays local to the move handler, so moving the
 * pointer over the stage never re-renders it.
 */
export function useHoverIntent({
  dwell = HOVER.dwell,
  ceiling = HOVER.ceiling,
  release = HOVER.release,
  scale = 1,
  disabled = false,
  trackSpeed = false,
}: {
  dwell?: number;
  ceiling?: number;
  release?: number;
  scale?: number;
  disabled?: boolean;
  trackSpeed?: boolean;
} = {}) {
  const [phase, setPhase] = useState<IntentPhase>("away");
  const [speed, setSpeed] = useState(0);
  const last = useRef<{ x: number; y: number; t: number } | null>(null);
  const dwellTimer = useRef<number | null>(null);
  const releaseTimer = useRef<number | null>(null);
  const inside = useRef(false);

  const clear = (r: React.MutableRefObject<number | null>) => {
    if (r.current !== null) window.clearTimeout(r.current);
    r.current = null;
  };

  const arm = useCallback(() => {
    clear(dwellTimer);
    setPhase((p) => (p === "engaged" ? p : "arming"));
    dwellTimer.current = window.setTimeout(() => {
      if (inside.current) setPhase("engaged");
    }, dwell * 1000);
  }, [dwell]);

  const onPointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      inside.current = true;
      clear(releaseTimer);
      last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      // Touch has no hover: a tap is a deliberate choice, so it engages at once.
      if (e.pointerType !== "mouse") {
        setPhase("engaged");
        return;
      }
      arm();
    },
    [arm, disabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || e.pointerType !== "mouse") return;
      const prev = last.current;
      last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      if (!prev) return;
      const dt = (e.timeStamp - prev.t) / 1000;
      if (dt <= 0) return;
      const px = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
      const ptPerSecond = px / Math.max(scale, 0.01) / dt;
      if (trackSpeed) setSpeed(ptPerSecond);
      // Moving fast: still on the way somewhere. The dwell starts over.
      if (ptPerSecond > ceiling) {
        setPhase((p) => (p === "engaged" ? p : "arming"));
        arm();
      }
    },
    [arm, ceiling, disabled, scale, trackSpeed],
  );

  const onPointerLeave = useCallback(() => {
    if (disabled) return;
    inside.current = false;
    clear(dwellTimer);
    if (trackSpeed) setSpeed(0);
    clear(releaseTimer);
    releaseTimer.current = window.setTimeout(() => setPhase("away"), release * 1000);
  }, [disabled, release, trackSpeed]);

  /** For touch and keyboard: open or close explicitly. */
  const toggle = useCallback(() => {
    setPhase((p) => (p === "engaged" ? "away" : "engaged"));
  }, []);

  useEffect(
    () => () => {
      clear(dwellTimer);
      clear(releaseTimer);
    },
    [],
  );

  return {
    phase,
    speed,
    engaged: phase === "engaged",
    toggle,
    setPhase,
    handlers: { onPointerEnter, onPointerMove, onPointerLeave },
  };
}
