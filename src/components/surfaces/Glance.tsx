"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { NOTCH } from "@/lib/notch";
import { useMinute } from "@/lib/useMinute";
import { ExpandedShell } from "./ExpandedShell";
import { Glyph, type GlyphName } from "./SFGlyph";

/**
 * The glance surface — ExpandedShell.swift's StatusSurface: what the notch shows
 * when you open it and nothing else is going on. Clock and date on the left, a
 * hairline, then charge and volume.
 *
 * REFERENCE IMPLEMENTATION for every other surface: real point sizes from the
 * Swift source at SurfaceMetrics scale 1, the system face, white on black at the
 * app's own opacities, tabular figures for anything that changes.
 *
 * Layout, as the app has it: two columns of equal width either side of the rule,
 * so the rule sits on the panel's centre line; sidePadding is 5.5% of the panel;
 * the clock asks for min(contentHeight × 0.42, width × 0.17) and, like
 * `.minimumScaleFactor(0.5)`, shrinks to fit its column when the time is long.
 */
const W = NOTCH.expanded.width;
const CONTENT_H = NOTCH.expanded.height - 32;
const SIDE = Math.min(40, Math.max(10, W * 0.055)); // 19.8
const CLOCK = Math.min(78, Math.max(22, Math.min(CONTENT_H * 0.42, W * 0.17))); // 54.6

export function Glance({
  battery = 80,
  onPower = true,
  charging = false,
  // Something audible. The glance is the surface that shows what the notch
  // carries when nothing is going on; showing it muted demonstrates the sound
  // switched off on a page whose line is "the battery and the volume".
  volume = 45,
}: {
  battery?: number;
  onPower?: boolean;
  charging?: boolean;
  volume?: number;
}) {
  const now = useNow();
  const low = !onPower && battery <= 20;
  const powerTint = low ? "text-bad" : onPower ? "text-good" : "text-white";
  const status = charging ? "Charging" : onPower ? (battery >= 95 ? "Charged" : "On Power") : "On Battery";

  return (
    <ExpandedShell active="status">
      <div className="flex h-full items-stretch gap-[14px] pb-[10px]" style={{ paddingInline: SIDE }}>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <FitClock text={now ? formatTime(now) : null} />
          <p className="mt-[2px] truncate text-[11px] font-medium text-white/50" suppressHydrationWarning>
            {now ? formatDate(now) : " "}
          </p>
        </div>
        <span aria-hidden="true" className="my-[4px] w-px shrink-0 bg-white/16" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-[8px]">
          <Row glyph={batteryGlyph(battery, onPower, charging)} tint={powerTint} value={`${battery}%`} detail={status} />
          <Row glyph={volumeGlyph(volume)} tint="text-white" value={`${volume}%`} detail={volume === 0 ? "Muted" : "Volume"} />
        </div>
      </div>
    </ExpandedShell>
  );
}

/** The clock at its asked-for size, scaled down (never below half) until it fits its column. */
function FitClock({ text }: { text: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLParagraphElement>(null);
  const [size, setSize] = useState(CLOCK);

  useLayoutEffect(() => {
    const b = box.current;
    const l = line.current;
    if (!b || !l || text == null) return;
    const fit = () => {
      // Layout sizes, not getBoundingClientRect: the stage around this is CSS-scaled.
      const natural = (l.scrollWidth / parseFloat(getComputedStyle(l).fontSize)) * CLOCK;
      const room = b.clientWidth;
      const next = CLOCK * Math.min(1, Math.max(0.5, room / natural));
      setSize((s) => (Math.abs(s - next) < 0.1 ? s : next));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={box} className="min-w-0">
      <p
        ref={line}
        className="tnum w-max leading-none font-extralight tracking-[1.5px] whitespace-nowrap"
        style={{ fontSize: size }}
        suppressHydrationWarning
      >
        {text ?? " "}
      </p>
    </div>
  );
}

function Row({ glyph, tint, value, detail }: { glyph: GlyphName; tint: string; value: string; detail: string }) {
  return (
    <div className="flex items-center gap-[8px]">
      <span className={`grid w-[18px] shrink-0 place-items-center ${tint}`}>
        <Glyph name={glyph} size={13} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className={`tnum text-[14px] font-semibold ${tint}`}>{value}</p>
        <p className="truncate text-[9px] text-white/55">{detail}</p>
      </div>
    </div>
  );
}

/** ExpandedShell.swift batterySymbol(). */
function batteryGlyph(pct: number, onPower: boolean, charging: boolean): GlyphName {
  if (charging) return "batteryBolt";
  if (onPower) return "powerplug";
  if (pct < 10) return "battery0";
  if (pct < 35) return "battery25";
  if (pct < 60) return "battery50";
  if (pct < 85) return "battery75";
  return "battery100";
}

/** SystemLevel.symbol for the built-in output. */
function volumeGlyph(pct: number): GlyphName {
  if (pct <= 0) return "speakerSlash";
  if (pct < 34) return "speaker1";
  if (pct < 67) return "speaker2";
  return "speaker3";
}

/** The time, set after hydration and refreshed on the minute — never on every frame. */
function useNow() {
  const m = useMinute();
  return m == null ? null : new Date(m);
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
