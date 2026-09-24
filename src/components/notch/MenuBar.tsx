"use client";

import { BatteryCharging, Search, SlidersHorizontal, Wifi } from "lucide-react";
import { type ReactNode } from "react";
import { useMinute } from "@/lib/useMinute";
import { HARDWARE } from "@/lib/notch";

/**
 * A macOS menu bar, redrawn at its real 32pt height on a notched display.
 *
 * Items are laid out in the two halves either side of the camera housing, as
 * macOS does — the housing is HARDWARE.width wide and nothing sits under it.
 * `eyes` is a slot for the googly eyes, which live among the status items.
 *
 * `clear` is the width the notch covers — the housing by default, the open
 * notch's outer width on a stage that shows it open. Items that do not fit
 * whole in the room either side drop out entirely, as macOS drops them, rather
 * than being sliced by the notch.
 *
 * Status items keep their real order — third-party items like the eyes sit to
 * the left of the system's — but they are CHOSEN by priority, not by what
 * happens to fit from the right. Dropping from the left would take the eyes
 * first, and the eyes are the thing worth showing; the search and Control
 * Centre glyphs are not.
 */
export function MenuBar({
  width,
  app = "Finder",
  menus = ["File", "Edit", "View", "Go"],
  eyes,
  showClock = true,
  clear = HARDWARE.width,
}: {
  width: number;
  app?: string;
  menus?: string[];
  eyes?: ReactNode;
  showClock?: boolean;
  clear?: number;
}) {
  const half = (width - clear) / 2;
  return (
    <div
      className="absolute inset-x-0 top-0 font-[family-name:var(--font-system)] text-[13px] text-white"
      style={{ height: HARDWARE.height, background: "rgb(0 0 0 / 0.26)" }}
    >
      <div
        aria-hidden
        className="absolute top-0 left-0 flex h-full flex-wrap content-start gap-x-[18px] overflow-hidden pl-[16px] leading-[32px]"
        style={{ width: half }}
      >
        <span className="font-semibold whitespace-nowrap">{app}</span>
        {menus.map((m) => (
          <span key={m} className="whitespace-nowrap text-white/95">
            {m}
          </span>
        ))}
      </div>
      <div
        className="absolute top-0 right-0 flex h-full items-center justify-end gap-[12px] overflow-hidden pr-[14px] pl-[14px]"
        style={{ width: half }}
      >
        {statusItems({ half, showClock, hasEyes: Boolean(eyes) }).map((key) => (
          // Everything but the eyes is wallpaper: a drawn menu bar that a
          // screen reader would otherwise read — fake app name, fake menu
          // titles, a second battery percentage and a clock that reticks —
          // ahead of the region's own heading.
          <span key={key} aria-hidden={key !== "eyes"} className="flex h-full items-center">
            {key === "eyes" ? (
              eyes
            ) : key === "battery" ? (
              <span className="flex items-center gap-[5px]">
                <span className="tnum text-[12px]">80%</span>
                <BatteryCharging size={17} strokeWidth={1.8} />
              </span>
            ) : key === "wifi" ? (
              <Wifi size={15} strokeWidth={2} />
            ) : key === "search" ? (
              <Search size={14} strokeWidth={2.2} />
            ) : key === "control" ? (
              <SlidersHorizontal size={14} strokeWidth={2.2} />
            ) : (
              <MenuClock />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

type StatusKey = "eyes" | "battery" | "wifi" | "search" | "control" | "clock";

/**
 * Which status items fit, in the order macOS shows them.
 *
 * Widths are constants rather than measurements: a measured layout would differ
 * between the server and the browser and produce a hydration mismatch, and
 * these glyphs are fixed sizes anyway. Priority decides what survives a tight
 * bar; order decides where the survivors sit.
 */
function statusItems({
  half,
  showClock,
  hasEyes,
}: {
  half: number;
  showClock: boolean;
  hasEyes: boolean;
}): StatusKey[] {
  // Array order is the order macOS draws them, left to right: third-party items
  // first, then the system's, with the clock last. `priority` is only about
  // what survives when the bar runs out of room.
  const ITEMS: { key: StatusKey; w: number; priority: number }[] = [
    { key: "eyes", w: 42, priority: 1 },
    { key: "battery", w: 50, priority: 2 },
    { key: "wifi", w: 15, priority: 4 },
    { key: "search", w: 14, priority: 6 },
    { key: "control", w: 14, priority: 5 },
    { key: "clock", w: 132, priority: 3 },
  ];
  const room = half - 28; // the half's own padding
  const gap = 12;
  const chosen = new Set<StatusKey>();
  let used = 0;
  for (const item of [...ITEMS].sort((a, b) => a.priority - b.priority)) {
    if (item.key === "eyes" && !hasEyes) continue;
    if (item.key === "clock" && !showClock) continue;
    const next = used + item.w + (chosen.size ? gap : 0);
    if (next > room) continue;
    chosen.add(item.key);
    used = next;
  }
  return ITEMS.filter((i) => chosen.has(i.key)).map((i) => i.key);
}

function MenuClock() {
  const m = useMinute();
  const t =
    m == null
      ? ""
      : new Date(m)
          .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
          .replace(",", "") +
        "  " +
        new Date(m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <span
      // The width the clock will occupy is reserved before it has a value: it
      // renders empty on the server, and without this its arrival pushes every
      // status item left — a layout shift on first paint of every page.
      className="tnum inline-block min-w-[132px] text-right whitespace-nowrap text-[12.5px]"
      suppressHydrationWarning
    >
      {t}
    </span>
  );
}
