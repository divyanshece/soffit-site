"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Scale a fixed-size drawing to whatever width it is given.
 *
 * The notch is drawn in real points (179 × 32) and the stage around it at a
 * fixed design width; scaling the whole stage keeps every radius and every
 * gap in proportion, where re-laying it out per breakpoint would not.
 */
export function useFitScale<T extends HTMLElement>(designWidth: number, max = 2) {
  const ref = useRef<T>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setScale(Math.min(max, w / designWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth, max]);

  return { ref, scale };
}
