"use client";

import clsx from "clsx";
import { type ComponentProps, type ReactNode, useSyncExternalStore } from "react";
import { MacStage } from "@/components/notch/MacStage";
import { MenuBar } from "@/components/notch/MenuBar";
import { HARDWARE, NOTCH, outerWidth } from "@/lib/notch";

const PHONE = "(max-width: 639px)";
const TABLET = "(max-width: 1023px)";

const watch = (query: string) => (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const subscribe = watch(PHONE);
const subscribeTablet = watch(TABLET);

/** True below 1024px; false on the server and while hydrating. */
export function useTablet() {
  return useSyncExternalStore(
    subscribeTablet,
    () => window.matchMedia(TABLET).matches,
    () => false,
  );
}

/**
 * True below 640px. The server and the hydrating render both say false, then
 * the browser's answer takes over, so nothing mismatches.
 */
export function usePhone() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

export interface StageSize {
  width: number;
  height: number;
}

/**
 * A MacStage that is drawn for the width it will be seen at. A slice of screen
 * laid out for a desktop column shrinks to nothing on a phone, so every stage
 * names a second, tighter slice — usually just the notch's own outer width —
 * and switches to it below 640px, where it also runs to the screen's edges.
 */
export function Stage({
  size,
  phone,
  tablet,
  maxScale = 2,
  wallpaper = "default",
  bleed = true,
  className,
  children,
}: {
  /** design size in points from 640px up */
  size: StageSize;
  /** design size in points below 640px; defaults to `tablet`, then `size` */
  phone?: StageSize;
  /** design size in points from 640 to 1023px; defaults to `size` */
  tablet?: StageSize;
  /** largest scale the drawing may reach. Default 2. */
  maxScale?: number;
  wallpaper?: "default" | "dark" | "none";
  /** on a phone, run past the page gutter to the screen's edges. Default true. */
  bleed?: boolean;
  className?: string;
  /** gets the design width in use (for the menu bar) and the scale */
  children: (width: number, scale: number) => ReactNode;
}) {
  const isPhone = usePhone();
  const isTablet = useTablet();
  const s = (isPhone && phone) || (isTablet && tablet) || size;
  return (
    // Capped at the drawing's largest size, so a stage that stops growing keeps
    // its left edge on the column's edge instead of floating in the middle.
    <div className={clsx(bleed && "-mx-5 sm:mx-0", className)} style={{ maxWidth: s.width * maxScale }}>
      <MacStage designWidth={s.width} designHeight={s.height} maxScale={maxScale} wallpaper={wallpaper}>
        {(scale) => children(s.width, scale)}
      </MacStage>
    </div>
  );
}

/**
 * The menu bar for a stage: the full redrawn bar on a wide slice, and on a
 * phone's tight slice (the notch's own width) only the bare band, because the
 * few points either side of an open notch would show nothing but clipped words.
 * Every stage that has a bar shows the notch open, so the bar keeps clear of
 * the open notch's full outer width, not just the camera housing.
 */
export function StageBar({ width, clear = outerWidth(NOTCH.expanded), ...bar }: ComponentProps<typeof MenuBar>) {
  if (width <= 460) return <Band />;
  return <MenuBar width={width} clear={clear} {...bar} />;
}

/** A plain strip of menu bar: the band the notch hangs in, with nothing on it. */
export function Band() {
  return <div aria-hidden="true" className="absolute inset-x-0 top-0" style={{ height: HARDWARE.height, background: "rgb(0 0 0 / 0.26)" }} />;
}
