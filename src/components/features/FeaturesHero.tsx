"use client";

import clsx from "clsx";
import { BatteryCharging, Clipboard, Eye, Gauge, Inbox, Music2, SunMedium, Timer } from "lucide-react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type FocusEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Spill } from "@/components/site/Spill";
import { useHoverIntent } from "@/lib/useHoverIntent";
import { CLOSE_SPRING, HARDWARE, LIGHT_SPRING, notchPath, OPEN_SPRING } from "@/lib/notch";
import { usePhone } from "./Stage";

/**
 * The page's index, drawn as the notch draws its own navigation.
 *
 * The notch hangs off the fascia at its real 179 × 32 and does nothing until a
 * hand asks it to: rest the pointer on it — the same dwell, the same speed
 * ceiling the app uses — and it widens into two ears either side of the camera
 * housing, four glyphs in each, one per feature below. Move away and it
 * retracts after the release grace. The middle 179 × 32 stays black and empty,
 * as on the display. Resting on a glyph names it under the lip, in the light.
 *
 * Nothing here performs unasked. The home page spends its whole hero teaching
 * that rule and this is the page the nav sends you to next, so the notch obeys
 * it here too.
 *
 * The eight links stay in the tab order while the ears are shut — they are
 * transparent and inert, not removed — and focus opens the index, so the
 * keyboard route is the same route.
 *
 * With reduced motion the ears are simply there; on a phone the ears would not
 * fit at real size, so the notch stays closed and the page is its own index.
 *
 * Renders a fragment: the notch, then the Spill, so it must be placed directly
 * in a full-bleed, positioned plane that is not a stacking context.
 */

export interface IndexEntry {
  /** the section id it jumps to */
  id: string;
  /** the feature's name, read out and shown under the lip */
  label: string;
  glyph: typeof Clipboard;
}

export const INDEX: readonly IndexEntry[] = [
  { id: "clipboard", label: "Clipboard", glyph: Clipboard },
  { id: "timers", label: "Timers", glyph: Timer },
  { id: "now-playing", label: "Now playing", glyph: Music2 },
  { id: "shelf", label: "Shelf", glyph: Inbox },
  { id: "levels", label: "Volume and brightness", glyph: SunMedium },
  { id: "battery", label: "Battery", glyph: BatteryCharging },
  { id: "status", label: "Status", glyph: Gauge },
  { id: "eyes", label: "Eyes", glyph: Eye },
];

const noop = () => () => {};
const H = HARDWARE.height;
/**
 * The flare the drawn chip grows at the top edge (LayoutMetrics collapsedTopRadius).
 * At rest it is 0: the app draws nothing at rest, so what is on screen is the
 * bare hardware cut-out — reference/notch-collapsed.png is a constant 179pt
 * wide from its top edge down, while reference/stopwatch-chip-collapsed.png,
 * which IS drawn, flares.
 */
const FLARE = 6;
const CORNER = 14;
// four 24pt glyphs with 2pt between them, and 14pt either side
const EAR = 14 + 4 * 24 + 3 * 2 + 14;
const OPEN_W = HARDWARE.width + EAR * 2;

/**
 * How much air round the drawing still counts as the notch, in points.
 * NotchDisplayController.geometryRejects(): the bare anchor rect inset by −2
 * while nothing is drawn, the drawn rect inset by −6 once something is.
 */
const SLOP_SHUT = 2;
const SLOP_OPEN = 6;

export function FeaturesHero() {
  const reduce = useReducedMotion();
  const phone = usePhone();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [focused, setFocused] = useState(false);
  const [named, setNamed] = useState<IndexEntry | null>(null);
  // Touch has no hover: the pointer is removed the instant the finger lifts, so
  // a tap has to latch the index open until something else is tapped.
  const [tapped, setTapped] = useState(false);
  const region = useRef<HTMLDivElement | null>(null);
  // The app's own rule, unchanged: rest 0.1 s, and a pointer over 1100 pt/s
  // is on its way somewhere else, so its dwell starts over.
  const intent = useHoverIntent({ disabled: phone });
  const open = hydrated && !phone && (reduce === true || intent.engaged || focused || tapped);

  useEffect(() => {
    if (!tapped) return;
    const away = (e: PointerEvent) => {
      if (!region.current?.contains(e.target as Node)) setTapped(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [tapped]);

  const body = useMotionValue<number>(HARDWARE.width);
  const flare = useMotionValue(0);
  const lit = useMotionValue(0.32);

  useEffect(() => {
    const w = open ? OPEN_W : HARDWARE.width;
    const f = open ? FLARE : 0;
    const l = open ? 0.6 : 0.32;
    if (reduce) {
      body.jump(w);
      flare.jump(f);
      lit.jump(l);
      return;
    }
    const spring = open ? OPEN_SPRING : CLOSE_SPRING;
    // Width and flare share a spring, or the shoulders arrive after the edge.
    const a = animate(body, w, spring);
    const c = animate(flare, f, spring);
    // The light is always slower than the edge it leaks from — the same spring
    // the home page's light takes, so both pages' light behaves the same.
    const b = animate(lit, l, LIGHT_SPRING);
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [open, reduce, body, flare, lit]);

  // A name only ever belongs to an index that is open.
  const shown = open ? named : null;

  const outer = useTransform(() => body.get() + flare.get() * 2);
  const d = useTransform(() => notchPath(body.get() + flare.get() * 2, H, flare.get(), CORNER));
  const shift = useTransform(outer, (w) => -w / 2);

  return (
    <>
      <div className="absolute inset-x-0 top-0 h-0">
        {/* The notch and the air the app still counts as the notch. It shrinks
            back to the hardware rect when shut, so a pointer crossing the
            fascia beside it never arms the dwell. */}
        <div
          ref={region}
          onPointerUp={(e) => {
            if (e.pointerType !== "mouse") setTapped((t) => !t);
          }}
          className="absolute top-0 left-1/2 -translate-x-1/2"
          style={{
            width: (open ? OPEN_W : HARDWARE.width) + (open ? SLOP_OPEN : SLOP_SHUT) * 2,
            height: H + (open ? SLOP_OPEN : SLOP_SHUT),
          }}
          {...intent.handlers}
          onPointerLeave={() => {
            setNamed(null);
            intent.handlers.onPointerLeave();
          }}
        >
          <motion.svg
            aria-hidden="true"
            className="absolute top-0 left-1/2 overflow-visible"
            style={{ x: shift, width: outer, height: H }}
          >
            <motion.path d={d} fill="var(--color-surface)" />
          </motion.svg>
          {/* Below 640px the ears would not fit at real size, so the index is
              not drawn at all and the page's own headings are its index. */}
          {phone ? null : (
          <nav
            aria-label="Features on this page"
            // max-[639px]:hidden says the same thing in CSS, for the first paint
            // and for a page with JavaScript off: the open width is 439pt, so a
            // nav left drawn at 390 would pan the page sideways.
            className="absolute top-0 left-1/2 -translate-x-1/2 font-[family-name:var(--font-system)] max-[639px]:hidden"
            // The nav is always the open width, so while the ears are shut it
            // must not be hit-tested: entering a descendant is entering the
            // region, and a 439pt box would arm the dwell across the fascia.
            style={{ width: OPEN_W, height: H, pointerEvents: open ? "auto" : "none" }}
            onFocus={() => setFocused(true)}
            onBlur={(e: FocusEvent<HTMLElement>) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
            }}
          >
            <Ear side="left" entries={INDEX.slice(0, 4)} open={open} reduce={!!reduce} onName={setNamed} />
            <Ear side="right" entries={INDEX.slice(4)} open={open} reduce={!!reduce} onName={setNamed} />
          </nav>
          )}
        </div>
      </div>
      <Spill width={body} intensity={lit} top={H} radius={CORNER} />
      {/* the name of whatever the pointer rests on, lit from above. The word
          sits in the brightest part of the spill, so it carries its own scrim. */}
      <div
        aria-hidden="true"
        className="narrow pointer-events-none absolute inset-x-0 text-center text-[13px] font-semibold text-ink [text-shadow:0_1px_2px_rgb(0_0_0/0.6),0_0_4px_rgb(0_0_0/0.5),0_0_12px_rgb(0_0_0/0.5)]"
        style={{ top: H + 16 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {shown ? (
            <motion.span
              key={shown.id}
              className="inline-block"
              initial={reduce ? false : { opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.09 } }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              {shown.label}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}

function Ear({
  side,
  entries,
  open,
  reduce,
  onName,
}: {
  side: "left" | "right";
  entries: readonly IndexEntry[];
  open: boolean;
  reduce: boolean;
  onName: (e: IndexEntry | null) => void;
}) {
  return (
    <motion.ul
      className={clsx(
        "absolute top-0 flex h-full items-center gap-[2px]",
        side === "left" ? "left-0 justify-start pl-[14px]" : "right-0 justify-end pr-[14px]",
      )}
      // Transparent rather than hidden while shut: an invisible link is still a
      // tab stop, and tabbing to one is what opens the index.
      style={{ width: EAR, pointerEvents: open ? "auto" : "none" }}
      initial={false}
      animate={{ opacity: open ? 1 : 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : open
            // 60ms behind the width, so nothing is squeezed by a shape still on its way.
            ? { duration: 0.14, delay: 0.06, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.09, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {entries.map((e) => {
        const Glyph = e.glyph;
        return (
          <li key={e.id} className="flex">
            <a
              href={`#${e.id}`}
              aria-label={e.label}
              onPointerEnter={() => onName(e)}
              onPointerLeave={() => onName(null)}
              onFocus={() => onName(e)}
              onBlur={() => onName(null)}
              className="relative grid h-[20px] w-[24px] place-items-center rounded-[5px] text-white/45 [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-x-px [@media(pointer:coarse)]:before:-inset-y-3 transition-colors duration-150 hover:bg-surface-well hover:text-surface-ink focus-visible:bg-surface-well focus-visible:text-surface-ink focus-visible:outline-offset-1"
            >
              <Glyph size={13} strokeWidth={2.2} aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </motion.ul>
  );
}
