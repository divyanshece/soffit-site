"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { useFitScale } from "@/lib/useFitScale";

/**
 * A slice of the top of a Mac's screen, drawn at real point sizes and scaled to
 * fit its container. Everything inside — menu bar, notch, surfaces — is laid out
 * in points; only this wrapper knows how big it ends up on the page.
 *
 * The wallpaper is the app's own stand-in desktop (NotchStage.swift), so the
 * site and the app's settings previews show the notch against the same ground.
 */
export function MacStage({
  designWidth = 760,
  designHeight = 280,
  wallpaper = "default",
  className,
  children,
  maxScale = 2,
}: {
  designWidth?: number;
  designHeight?: number;
  wallpaper?: "default" | "dark" | "none";
  className?: string;
  children: (scale: number) => ReactNode;
  maxScale?: number;
}) {
  const { ref, scale } = useFitScale<HTMLDivElement>(designWidth, maxScale);
  return (
    // overflow-clip: before the first measure (and with JavaScript off) the drawing
    // sits at scale 1, and a 1000pt slice must not widen a phone's page — on
    // mobile that zooms the layout viewport out and the phone layout never engages.
    // `clip`, not `hidden`, so nothing inside can scroll this box.
    <div ref={ref} className={clsx("relative w-full overflow-clip", className)} style={{ height: designHeight * scale }}>
      <div
        className="absolute top-0 left-1/2 overflow-hidden"
        style={{
          width: designWidth,
          height: designHeight,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: "top center",
          background:
            wallpaper === "default"
              ? "linear-gradient(135deg, var(--color-desk-1) 0%, var(--color-desk-2) 55%, var(--color-desk-3) 100%)"
              : wallpaper === "dark"
                ? "radial-gradient(120% 90% at 50% 0%, #2a2e35, #14161b 70%)"
                : "transparent",
        }}
      >
        {children(scale)}
      </div>
    </div>
  );
}
