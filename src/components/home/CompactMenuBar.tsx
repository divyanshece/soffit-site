"use client";

import { BatteryCharging } from "lucide-react";
import type { ReactNode } from "react";
import { HARDWARE } from "@/lib/notch";

/**
 * The menu bar as a phone sees it: the hero stage is only ~490pt wide there,
 * and MenuBar's full set of status items overflows its half and pushes the
 * eyes out of the left edge. This keeps what the half can hold — the app name
 * on the left, the eyes and the battery on the right — at MenuBar's own sizes
 * and translucency, so the two read as the same bar.
 *
 * `clear` is the width the notch covers, as on MenuBar: the camera housing by
 * default, the OPEN notch's outer width on a stage that opens it. Reserving
 * only the housing meant the hero's notch — which opens by itself in the lap,
 * and is open at rest under prefers-reduced-motion — painted straight over the
 * eyes, on the first screen a phone visitor sees.
 */
export function CompactMenuBar({
  width,
  eyes,
  app = "Finder",
  clear = HARDWARE.width,
}: {
  width: number;
  eyes?: ReactNode;
  app?: string;
  clear?: number;
}) {
  const half = Math.max(0, (width - clear) / 2);
  return (
    <div
      className="absolute inset-x-0 top-0 font-[family-name:var(--font-system)] text-[13px] text-white"
      style={{ height: HARDWARE.height, background: "rgb(0 0 0 / 0.26)" }}
    >
      <div
        aria-hidden
        className="absolute top-0 left-0 flex h-full items-center overflow-hidden pl-[16px]"
        style={{ width: half }}
      >
        <span className="font-semibold">{app}</span>
      </div>
      <div
        className="absolute top-0 right-0 flex h-full items-center justify-end gap-[12px] overflow-hidden pr-[14px] pl-[10px]"
        style={{ width: half }}
      >
        {eyes}
        <span aria-hidden className="flex items-center gap-[5px]">
          <span className="tnum text-[12px]">80%</span>
          <BatteryCharging size={17} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}
