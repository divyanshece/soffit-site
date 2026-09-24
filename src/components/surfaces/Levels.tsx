"use client";

import clsx from "clsx";
import { AnimatePresence, motion, type Transition, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { HARDWARE, NOTCH, swiftSpring } from "@/lib/notch";
import { Glyph, type GlyphName } from "./SFGlyph";

/**
 * The activity readouts: what the notch drops down for a moment when the volume,
 * the brightness or the charger changes. SystemLevelView.swift + LevelReadout.swift
 * and ChargeActivityView.swift, redrawn.
 *
 * Both are laid out for the activity panel — 227 × 78, of which the top 32pt is
 * the camera housing and is never drawn in — at the sizes the app itself works
 * out there. SurfaceMetrics for that panel: widthRatio 227/360, heightRatio 46/92,
 * so `scale` bottoms out at its 0.8 clamp, and every `font()`/`space()` below is
 * the Swift base size × 0.8, rounded, exactly as SurfaceMetrics rounds it.
 */

/* ── metrics ─────────────────────────────────────────────────────────────── */

const ACTIVITY = NOTCH.activity;
const SCALE = 0.8; // SurfaceMetrics.scale for the default activity panel
const m = (base: number) => Math.round(base * SCALE);
/** SurfaceMetrics.sidePadding: 5.5% of the panel, clamped 10…40. */
const SIDE = Math.min(40, Math.max(10, ACTIVITY.width * 0.055));

/* Springs, converted from SwiftUI's (response, dampingFraction). */
const VALUE_SPRING = swiftSpring(0.26, 0.82); // LevelReadout .animation(value:)
const LAND_SPRING = swiftSpring(0.26, 0.8); // SystemLevelView landed
const CHARGE_SPRING = swiftSpring(0.32, 0.66); // ChargeActivityView landed — a little bounce
/**
 * Reduced motion: every animation still resolves to its final state, instantly.
 * `initial` never depends on the preference — the server can't know it, and a
 * differing initial style is a hydration mismatch — only the transition does.
 */
const INSTANT = { duration: 0 } as const;

/* ── model: SystemLevel.swift ────────────────────────────────────────────── */

export type LevelKind = "volume" | "brightness";
export type OutputKind = "builtIn" | "headphones" | "airPods" | "bluetooth" | "display" | "airPlay" | "external";

/** macOS moves volume and brightness in sixteenths; Option+key moves a quarter of that. */
export const LEVEL_STEP = 1 / 16;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const percentage = (v: number) => Math.round(clamp01(v) * 100);

function levelGlyph(kind: LevelKind, value: number, muted: boolean, output?: OutputKind): GlyphName {
  if (kind === "brightness") return value < 0.5 ? "sunMin" : "sunMax";
  if (muted || value <= 0.001) return "speakerSlash";
  // A device with a glyph of its own outranks the speaker waves.
  if (output && output !== "builtIn") return DEVICE_GLYPH[output];
  if (value < 0.34) return "speaker1";
  if (value < 0.67) return "speaker2";
  return "speaker3";
}

const DEVICE_GLYPH: Record<Exclude<OutputKind, "builtIn">, GlyphName> = {
  headphones: "headphones",
  airPods: "airpods",
  bluetooth: "hifispeaker",
  external: "hifispeaker",
  display: "display",
  airPlay: "airplay",
};

/* ── <LevelReadout> ──────────────────────────────────────────────────────── */

/**
 * The volume / brightness readout, as the notch shows it in state="activity".
 * Render it as the child of <Notch state="activity" contentKey={kind}> — keyed on
 * the kind, as the app keys it, so holding a key slides one bar instead of
 * replaying the entrance on every step.
 */
export function LevelReadout({
  kind,
  value,
  muted = false,
  available = true,
  output,
}: {
  /** Which level: the glyph and title follow it. */
  kind: LevelKind;
  /** The level, 0…1. The keys move it in sixteenths (LEVEL_STEP); the readout shows any value. */
  value: number;
  /** Volume only: slashed speaker, "Muted", an empty bar; the percentage keeps the underlying value. */
  muted?: boolean;
  /** False when the device has no control (an AirPlay output, an undimmable display): "No control", no bar. */
  available?: boolean;
  /** Volume only: where the sound is going. Anything but the built-in speakers is named under the title and gets its own glyph. */
  output?: { name: string; kind: OutputKind };
}) {
  const reduce = useReducedMotion();
  const isMuted = kind === "volume" && muted;
  const v = clamp01(value);
  const pct = percentage(v);
  const glyph = levelGlyph(kind, v, isMuted, kind === "volume" ? output?.kind : undefined);
  const detail = kind === "volume" && output && output.kind !== "builtIn" ? output.name : null;
  const title = isMuted ? "Muted" : kind === "volume" ? "Volume" : "Brightness";
  const fill = isMuted ? 0 : v;

  return (
    <div
      className="absolute inset-0 font-[family-name:var(--font-system)] text-surface-ink"
      role="img"
      aria-label={available ? `${title}, ${pct}%${detail ? `, ${detail}` : ""}` : `${title}, no control`}
    >
      <motion.div
        aria-hidden="true"
        className="absolute"
        style={{ top: HARDWARE.height, left: SIDE, right: SIDE }}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? INSTANT : LAND_SPRING}
      >
        <div className="flex items-center" style={{ gap: m(10) }}>
          <span
            className={clsx(
              "grid shrink-0 place-items-center transition-colors duration-180 ease-out",
              isMuted ? "text-white/50" : "text-white",
            )}
            style={{ width: m(22), height: m(14) + 2 }}
          >
            <SwapGlyph name={glyph} size={m(14)} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate leading-[1.2] font-semibold" style={{ fontSize: m(11.5) }}>
              {title}
            </span>
            {detail ? (
              <span className="truncate leading-[1.2] text-white/50" style={{ fontSize: m(9) }}>
                {detail}
              </span>
            ) : null}
          </span>
          <span className="flex-1" style={{ minWidth: m(6) }} />
          {available ? (
            <span className="font-medium text-white/60" style={{ fontSize: m(11) }}>
              <Rolling value={pct} />%
            </span>
          ) : (
            <span className="whitespace-nowrap text-white/45" style={{ fontSize: m(10) }}>
              No control
            </span>
          )}
        </div>
        {available ? (
          <Track
            fraction={fill}
            height={Math.min(10, Math.max(4, m(5)))}
            minWidth={fill > 0 ? 5 : 0}
            className="bg-white/14"
            fillStyle={{
              backgroundImage: isMuted
                ? "linear-gradient(to right, rgb(255 255 255 / 0.175), rgb(255 255 255 / 0.5))"
                : "linear-gradient(to right, rgb(255 255 255 / 0.72), rgb(255 255 255))",
            }}
            transition={reduce ? INSTANT : VALUE_SPRING}
            initial={false}
            style={{ marginTop: m(7) }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}

/* ── <ChargeReadout> ─────────────────────────────────────────────────────── */

export type ChargeKind = "connected" | "holding" | "disconnected" | "charged" | "low";

const CHARGE: Record<ChargeKind, { title: string; tint: string; glyph: GlyphName; energised: boolean }> = {
  connected: { title: "Charging", tint: "var(--color-good)", glyph: "bolt", energised: true },
  holding: { title: "On Power", tint: "var(--color-good)", glyph: "powerplug", energised: true },
  charged: { title: "Charged", tint: "var(--color-good)", glyph: "checkCircle", energised: true },
  disconnected: { title: "On Battery", tint: "rgb(255 255 255 / 0.92)", glyph: "battery50", energised: false },
  low: { title: "Low Battery", tint: "var(--color-bad)", glyph: "warning", energised: false },
};

/**
 * The bar's ramp: the tint at 70% on the left, solid on the right.
 *
 * A mask rather than `color-mix(…, transparent)` in the gradient, because this
 * is an inline style — React hands it to the browser untouched, so nothing
 * generates a fallback, and a browser that drops the declaration loses the
 * whole fill rather than one stop. Masking the solid tint is the same paint.
 */
const RAMP = "linear-gradient(to right, rgb(0 0 0 / 0.7), rgb(0 0 0))";

/**
 * The charger readout: a small panel drops out from under the housing, says one
 * thing, retracts. On mount the glyph springs up from 40%, a single green bloom
 * settles (energised kinds only — never a pulse), and the bar fills from empty.
 * Nothing moves after ~700 ms. Give it a new React `key` to replay the entrance
 * for a repeat event, as the app does with its activity token.
 */
export function ChargeReadout({
  percent,
  charging = true,
  kind: kindOverride,
}: {
  /** Battery charge, 0…100. Rolls and refills when it changes. */
  percent: number;
  /** Cable in and charging (green bolt, "Charging") or out ("On Battery"). Ignored when `kind` is given. */
  charging?: boolean;
  /** Every state the app raises: connected, holding (cable in, macOS holding at 80%), disconnected, charged, low. */
  kind?: ChargeKind;
}) {
  const reduce = useReducedMotion();
  const kind: ChargeKind = kindOverride ?? (charging ? "connected" : "disconnected");
  const k = CHARGE[kind];
  const pct = Math.round(Math.min(100, Math.max(0, percent)));
  const t = reduce ? INSTANT : CHARGE_SPRING;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center font-[family-name:var(--font-system)] text-surface-ink"
      style={{ paddingInline: m(10), paddingTop: HARDWARE.height }}
      role="img"
      aria-label={`${pct}%, ${k.title}`}
    >
      <motion.div
        aria-hidden="true"
        className="flex items-center"
        style={{ gap: m(8) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={t}
      >
        <span className="relative grid place-items-center" style={{ width: m(18), height: m(18), color: k.tint }}>
          {k.energised ? (
            <motion.span
              key={kind}
              className="absolute rounded-full"
              style={{ width: m(22), height: m(22), background: k.tint, filter: `blur(${m(7)}px)` }}
              initial={{ opacity: 0.5, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={t}
            />
          ) : null}
          <motion.span
            className="relative grid place-items-center"
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            transition={t}
          >
            <SwapGlyph name={k.glyph} size={m(12)} />
          </motion.span>
        </span>
        <span className="font-semibold" style={{ fontSize: m(13) }}>
          <Rolling value={pct} />%
        </span>
        <span className="whitespace-nowrap text-white/55" style={{ fontSize: m(11) }}>
          {k.title}
        </span>
      </motion.div>
      <Track
        fraction={pct / 100}
        height={3}
        minWidth={3}
        className="self-stretch bg-white/16"
        fillStyle={{ backgroundColor: k.tint, maskImage: RAMP, WebkitMaskImage: RAMP }}
        transition={t}
        initial
        style={{ marginTop: 7, marginInline: m(22) }}
      />
    </div>
  );
}

/* ── shared pieces ───────────────────────────────────────────────────────── */

/** A capsule track with a capsule fill, as LevelTrack / LevelBar draw it. */
function Track({
  fraction,
  height,
  minWidth,
  className,
  fillStyle,
  transition,
  initial,
  style,
}: {
  fraction: number;
  height: number;
  /** the fill never draws narrower than this */
  minWidth: number;
  className?: string;
  fillStyle: React.CSSProperties;
  transition: Transition;
  /** true: fill from empty on mount */
  initial: boolean;
  style?: React.CSSProperties;
}) {
  const w = `${(fraction * 100).toFixed(3)}%`;
  return (
    <div className={clsx("relative overflow-hidden rounded-full", className)} style={{ height, ...style }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ ...fillStyle, minWidth }}
        initial={initial ? { width: "0%" } : false}
        animate={{ width: w }}
        transition={transition}
      />
    </div>
  );
}

/**
 * A number that rolls when it changes, digit by digit, with tabular figures —
 * SwiftUI's .contentTransition(.numericText). Only the digits that change move;
 * going up they arrive from below, going down from above.
 */
export function Rolling({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [prev, setPrev] = useState({ value, dir: 1 });
  if (prev.value !== value) setPrev({ value, dir: value > prev.value ? 1 : -1 });
  const dir = prev.dir;
  const digits = String(value).split("");
  return (
    <span className="tnum inline-flex">
      {digits.map((d, i) => {
        const place = digits.length - 1 - i; // key by place value so the units column stays put
        return (
          <span key={place} className={clsx("inline-grid", ROLL_WINDOW)}>
            <AnimatePresence initial={false} custom={dir}>
              <motion.span
                key={d}
                custom={dir}
                className="[grid-area:1/1]"
                variants={{
                  enter: (s: number) => ({ y: `${0.55 * s}em`, opacity: 0 }),
                  center: { y: 0, opacity: 1 },
                  exit: (s: number) => ({ y: `${-0.55 * s}em`, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {d}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}

/**
 * The window each place rolls through, so the digit leaving is cut off at the
 * line rather than painting above it.
 *
 * Not `overflow: hidden` — the places are flex items, and making one a scroll
 * container moves the baseline the row is set on, which would shift the whole
 * number against the "%" beside it. `mask-repeat` matters: left to tile, the
 * gradient repeats and the digit reappears above the line.
 *
 * As a class rather than an inline style, so the preference is read by CSS. A
 * `useReducedMotion()` branch in the markup is a hydration mismatch: the server
 * cannot know the preference, and the client's first render already does.
 */
const ROLL_WINDOW =
  "motion-safe:[mask-image:linear-gradient(transparent,black_18%,black_82%,transparent)] motion-safe:[mask-repeat:no-repeat] motion-safe:[-webkit-mask-image:linear-gradient(transparent,black_18%,black_82%,transparent)] motion-safe:[-webkit-mask-repeat:no-repeat]";

/** A glyph that cross-fades into the next, like .contentTransition(.symbolEffect(.replace)). */
function SwapGlyph({ name, size }: { name: GlyphName; size: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-grid place-items-center">
      <AnimatePresence initial={false}>
        <motion.span
          key={name}
          className="grid place-items-center [grid-area:1/1]"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Glyph name={name} size={size} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ── the keys ────────────────────────────────────────────────────────────── */

export type LevelKey = "brightnessDown" | "brightnessUp" | "mute" | "volumeDown" | "volumeUp";

export interface LevelsState {
  /** 0…1 */
  volume: number;
  /** 0…1 */
  brightness: number;
  muted: boolean;
}

/**
 * What a key does to the levels — SystemLevel.stepped(by:fine:) and
 * SystemLevelMonitor.toggleMute(). Sixteenths, a quarter of that with Option,
 * and turning the volume up unmutes, the way the hardware keys do.
 */
export function applyLevelKey(s: LevelsState, key: LevelKey, fine = false): LevelsState {
  const step = fine ? LEVEL_STEP / 4 : LEVEL_STEP;
  switch (key) {
    case "mute":
      return { ...s, muted: !s.muted };
    case "volumeUp":
      return { ...s, volume: clamp01(s.volume + step), muted: false };
    case "volumeDown":
      return { ...s, volume: clamp01(s.volume - step) };
    case "brightnessUp":
      return { ...s, brightness: clamp01(s.brightness + step) };
    case "brightnessDown":
      return { ...s, brightness: clamp01(s.brightness - step) };
  }
}

const kindOf = (key: LevelKey): LevelKind => (key.startsWith("brightness") ? "brightness" : "volume");

/**
 * Levels plus the notch's presentation of them: `visible` goes true on every key
 * and back to false 1.3 s after the last one (the app raises the readout for
 * 1.3 s), and `kind` is whichever level changed last.
 */
export function useLevels(initial: LevelsState = { volume: 0.5, brightness: 0.75, muted: false }, hideAfter = 1.3) {
  const [state, setState] = useState(initial);
  const [kind, setKind] = useState<LevelKind>("volume");
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const press = useCallback(
    (key: LevelKey, fine = false) => {
      setState((s) => applyLevelKey(s, key, fine));
      setKind(kindOf(key));
      setVisible(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setVisible(false), hideAfter * 1000);
    },
    [hideAfter],
  );

  useEffect(() => {
    // Nothing left pending in a hidden tab, or after unmount.
    const onHide = () => {
      if (document.hidden) {
        window.clearTimeout(timer.current);
        setVisible(false);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.clearTimeout(timer.current);
    };
  }, []);

  const announce =
    kind === "volume"
      ? state.muted
        ? "Muted"
        : `Volume ${percentage(state.volume)}%`
      : `Brightness ${percentage(state.brightness)}%`;

  return { state, kind, visible, press, announce };
}

const KEYS: { key: LevelKey; label: string; name: string; glyph: GlyphName }[] = [
  { key: "brightnessDown", label: "F1", name: "Brightness down", glyph: "sunMin" },
  { key: "brightnessUp", label: "F2", name: "Brightness up", glyph: "sunMax" },
  { key: "mute", label: "F10", name: "Mute", glyph: "speaker" },
  { key: "volumeDown", label: "F11", name: "Volume down", glyph: "speaker1" },
  { key: "volumeUp", label: "F12", name: "Volume up", glyph: "speaker3" },
];

/**
 * The media keys from a MacBook's function row, as buttons: F1 F2 for
 * brightness, F10 F11 F12 for sound. While the row (or a key in it) has focus,
 * the real ↑ and ↓ keys drive `arrows` too, with Option for quarter steps.
 */
export function LevelKeys({
  onPress,
  arrows = "volume",
  announce,
  className,
}: {
  /** Called for every press — wire it to useLevels().press, or to applyLevelKey. `fine` is Option held. */
  onPress: (key: LevelKey, fine: boolean) => void;
  /** Which level ↑/↓ move while the row has focus. */
  arrows?: LevelKind;
  /** Text for a polite live region, e.g. useLevels().announce, so a screen reader hears the new level. */
  announce?: string;
  className?: string;
}) {
  const [lit, setLit] = useState<LevelKey | null>(null);
  const hintId = useId();

  /**
   * Holding a media key on a Mac slides the level rather than stepping it once:
   * macOS waits 400 ms, then repeats every 90 ms. The app never schedules this
   * itself — it receives the hardware's repeats — so the site has to.
   *
   * No `touch-action: none` on the keys. A stationary hold never becomes a
   * scroll, and a finger that does move should scroll the page rather than run
   * the volume up; the browser sends `pointercancel` at that moment, which stops
   * the repeat on its own.
   */
  const press = useRef(onPress);
  useEffect(() => {
    press.current = onPress;
  });
  const alt = useRef(false);
  const timers = useRef<{ delay?: number; tick?: number }>({});
  const fromPointer = useRef(false);

  const stop = useCallback(() => {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.tick);
    timers.current = {};
    setLit(null);
  }, []);

  const hold = useCallback((key: LevelKey) => {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.tick);
    // Mute does not repeat: it is a toggle, not a level.
    if (key === "mute") return;
    timers.current.delay = window.setTimeout(() => {
      timers.current.tick = window.setInterval(() => press.current(key, alt.current), 90);
    }, 400);
  }, []);

  // Option can be taken or released mid-hold; the next repeat follows it.
  useEffect(() => {
    const track = (e: globalThis.KeyboardEvent) => {
      alt.current = e.altKey;
    };
    window.addEventListener("keydown", track);
    window.addEventListener("keyup", track);
    return () => {
      window.removeEventListener("keydown", track);
      window.removeEventListener("keyup", track);
      window.clearTimeout(timers.current.delay);
      window.clearInterval(timers.current.tick);
    };
  }, []);

  // The settled value, 200 ms after the last step: a three-second hold reads out
  // one level, not thirty.
  const [spoken, setSpoken] = useState(announce);
  useEffect(() => {
    const t = window.setTimeout(() => setSpoken(announce), 200);
    return () => window.clearTimeout(t);
  }, [announce]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const key: LevelKey =
      arrows === "volume"
        ? e.key === "ArrowUp" ? "volumeUp" : "volumeDown"
        : e.key === "ArrowUp" ? "brightnessUp" : "brightnessDown";
    setLit(key);
    // The browser's own key repeat comes through as further keydowns; that is
    // the honest equivalent of the hardware autorepeat, so it is not swallowed.
    onPress(key, e.altKey);
  };

  return (
    <div
      role="group"
      aria-label="Function keys"
      aria-describedby={hintId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={() => setLit(null)}
      onBlur={() => setLit(null)}
      className={clsx("inline-flex items-end gap-[6px] rounded-[10px] p-[6px] sm:gap-[8px]", className)}
    >
      {KEYS.map((k, i) => (
        <span key={k.key} className={clsx("flex", i === 2 && "ml-[10px] sm:ml-[18px]")}>
          <button
            type="button"
            aria-label={`${k.name} (${k.label})`}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              alt.current = e.altKey;
              fromPointer.current = true;
              setLit(k.key);
              onPress(k.key, e.altKey);
              hold(k.key);
            }}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onClick={(e) => {
              // The pointer already fired this one on the way down; this is the
              // keyboard's Return or Space.
              if (fromPointer.current) {
                fromPointer.current = false;
                return;
              }
              onPress(k.key, e.altKey);
            }}
            data-lit={lit === k.key || undefined}
            className={clsx(
              "group relative flex h-[38px] w-[46px] cursor-pointer flex-col items-center justify-between rounded-[6px] pt-[8px] pb-[4px] sm:h-[42px] sm:w-[54px]",
              "border border-hair bg-plane-deep font-[family-name:var(--font-system)] text-ink-2",
              "shadow-[inset_0_1px_0_var(--color-hair),0_2px_0_var(--color-fascia)] transition-[transform,box-shadow,color] duration-100",
              "hover:text-ink data-lit:translate-y-[1px] data-lit:text-ink data-lit:shadow-[inset_0_1px_0_var(--color-hair),0_1px_0_var(--color-fascia)]",
            )}
          >
            <Glyph name={k.glyph} size={14} />
            <span className="text-[8px] leading-none text-ink-3 sm:text-[9px]">{k.label}</span>
          </button>
        </span>
      ))}
      <span id={hintId} className="sr-only">
        Up and down arrows change the {arrows} while this row has focus.
      </span>
      <span className="sr-only" aria-live="polite">
        {spoken}
      </span>
    </div>
  );
}
