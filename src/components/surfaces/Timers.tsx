"use client";

import clsx from "clsx";
import { useReducedMotion } from "motion/react";
import { type CSSProperties, type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ExpandedShell } from "./ExpandedShell";

/**
 * The timers surface — TimerView.swift's TimerSurfaceView, plus the resident
 * readout the notch keeps after you move away (TimerResidentView) and the
 * notice it shows when a countdown runs out (TimerFinishedView).
 *
 * The model is Timers.swift, ported rule for rule: every timer records WHEN it
 * started and derives its value from the clock on demand. Nothing here adds up
 * ticks. The display redraws on requestAnimationFrame, and only while a timer
 * is running and the surface is on screen in a visible tab.
 *
 * Sizes are SurfaceMetrics at scale 1 — the 360 × 162 panel leaves 130pt under
 * the housing, which is exactly the reference content height the app lays out
 * against — so every number below is the Swift source's own.
 */

// ─── model (Timers.swift) ──────────────────────────────────────────────────

export type TimerMode = "stopwatch" | "countdown" | "pomodoro";
export type RunState = "idle" | "running" | "paused" | "finished";
export type PomodoroPhase = "work" | "shortBreak" | "longBreak";
export type TimerUrgency = "calm" | "imminent" | "finished";

/** Seconds on a monotonic clock — ProcessInfo.systemUptime's stand-in. */
const clock = () => performance.now() / 1000;

interface Run {
  state: RunState;
  /** time banked by earlier runs */
  banked: number;
  /** when the current run began; null while not running, or before mount */
  startedAt: number | null;
}

interface StopwatchModel extends Run {
  /** absolute elapsed marks, oldest first */
  laps: number[];
}

interface CountdownModel extends Run {
  duration: number;
}

interface PomodoroModel {
  phase: PomodoroPhase;
  /** completed focus blocks in the current set */
  completed: number;
  timer: CountdownModel;
}

export interface TimersModel {
  mode: TimerMode;
  stopwatch: StopwatchModel;
  countdown: CountdownModel;
  pomodoro: PomodoroModel;
  /** what just ran out, for the notice; `at` is on the same clock as everything else */
  finish: { title: string; detail: string; at: number } | null;
}

/** Pomodoro.Configuration defaults: 25 / 5 / 15, a long break after every fourth block. */
export const POMODORO = { work: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60, cycles: 4 } as const;
const PHASE_TITLE: Record<PomodoroPhase, string> = { work: "Focus", shortBreak: "Break", longBreak: "Long break" };
const MODE_TITLE: Record<TimerMode, string> = { stopwatch: "Stopwatch", countdown: "Timer", pomodoro: "Focus" };
const WARNING_WINDOW = 5;
/** How long the "focus block done" notice holds the notch (Activity duration 3.2s). */
const NOTICE_SECONDS = 3.2;

const consumed = (r: Run, now: number) =>
  r.state === "running" && r.startedAt !== null ? r.banked + (now - r.startedAt) : r.banked;
const remaining = (c: CountdownModel, now: number) => Math.max(0, c.duration - consumed(c, now));
const progress = (c: CountdownModel, now: number) =>
  c.duration > 0 ? Math.min(1, Math.max(0, consumed(c, now) / c.duration)) : 0;
const phaseDuration = (p: PomodoroPhase) => POMODORO[p];

const newCountdown = (duration: number): CountdownModel => ({ state: "idle", duration, banked: 0, startedAt: null });

function start<T extends Run>(r: T, now: number): T {
  if (r.state === "running") return r;
  return { ...r, banked: r.state === "finished" ? 0 : r.banked, startedAt: now, state: "running" };
}
function pause<T extends Run>(r: T, now: number): T {
  if (r.state !== "running") return r;
  return { ...r, banked: consumed(r, now), startedAt: null, state: "paused" };
}
const toggle = <T extends Run>(r: T, now: number): T => (r.state === "running" ? pause(r, now) : start(r, now));

function advance(p: PomodoroModel, now: number, autostart: boolean): PomodoroModel {
  let { phase, completed } = p;
  if (phase === "work") {
    completed += 1;
    phase = completed % POMODORO.cycles === 0 ? "longBreak" : "shortBreak";
  } else {
    phase = "work";
  }
  const timer = newCountdown(phaseDuration(phase));
  return { phase, completed, timer: autostart ? start(timer, now) : timer };
}

/** Does anything cross zero at `now`? Cheap enough to ask every frame. */
function needsSettle(m: TimersModel, now: number) {
  const due = (c: CountdownModel) => c.state === "running" && c.startedAt !== null && remaining(c, now) <= 0;
  return due(m.countdown) || due(m.pomodoro.timer);
}

/**
 * Countdown.settle and Pomodoro.settle. A focus block that ran out while the
 * page was hidden starts its break at the moment it actually ended, not when
 * someone next looked — the anchor is exact, so the next phase is too.
 */
function settle(m: TimersModel, now: number): TimersModel {
  let next = m;
  const c = m.countdown;
  if (c.state === "running" && c.startedAt !== null && remaining(c, now) <= 0) {
    next = {
      ...next,
      countdown: { ...c, state: "finished", banked: c.duration, startedAt: null },
      finish: { title: "Timer finished", detail: `${formatCountdown(c.duration)} elapsed`, at: now },
    };
  }
  let p = next.pomodoro;
  for (let guard = 0; guard < 64; guard++) {
    const t = p.timer;
    if (t.state !== "running" || t.startedAt === null || remaining(t, now) > 0) break;
    const crossed = t.startedAt + (t.duration - t.banked);
    const ended = p.phase;
    p = advance(p, crossed, true);
    next = {
      ...next,
      pomodoro: p,
      finish: {
        title: ended === "work" ? "Focus block done" : "Break over",
        detail: p.phase === "work" ? "Back to focus" : `Time for a ${PHASE_TITLE[p.phase].toLowerCase()}`,
        at: crossed,
      },
    };
  }
  return next;
}

function stateOf(m: TimersModel, mode: TimerMode = m.mode): RunState {
  return mode === "stopwatch" ? m.stopwatch.state : mode === "countdown" ? m.countdown.state : m.pomodoro.timer.state;
}

function urgencyOf(m: TimersModel, now: number): TimerUrgency {
  const of = (c: CountdownModel, finished: boolean): TimerUrgency => {
    if (finished) return "finished";
    const r = remaining(c, now);
    return c.state === "running" && r > 0 && r <= WARNING_WINDOW ? "imminent" : "calm";
  };
  if (m.mode === "countdown") return of(m.countdown, m.countdown.state === "finished");
  if (m.mode === "pomodoro") return of(m.pomodoro.timer, false);
  return "calm";
}

/** TimerUrgency.opacity — a hard blink read off the clock, never a fade. */
function blink(u: TimerUrgency, now: number) {
  if (u === "imminent") return now % 1 < 0.55 ? 1 : 0.25;
  if (u === "finished") return now % 0.9 < 0.5 ? 1 : 0.3;
  return 1;
}

// ─── formatting (TimerFormat) ──────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

/** `12:34.5` under an hour, `1:02:03` beyond it. */
export function formatStopwatch(t: number) {
  const total = Math.max(0, t);
  const s = Math.floor(total);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  // The epsilon keeps 5.1 reading 5.1 rather than 5.0 after float subtraction.
  const tenths = Math.min(9, Math.floor((total - s) * 10 + 1e-6));
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}.${tenths}`;
}

/** Whole seconds, rounded up: a countdown ticking tenths is just noise. */
export function formatCountdown(t: number) {
  const s = Math.max(0, Math.ceil(t - 1e-9));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

// ─── the controller ────────────────────────────────────────────────────────

/**
 * A starting point, for benches and for scripted demos. Times are in seconds.
 * A seed marked `running` starts counting from its value once the page has
 * mounted — unless reduced motion is on, where it stays still at that value.
 */
export interface TimersSeed {
  mode?: TimerMode;
  stopwatch?: { state?: "idle" | "running" | "paused"; elapsed?: number; laps?: number[] };
  countdown?: { state?: RunState; duration?: number; elapsed?: number };
  pomodoro?: { state?: "idle" | "running" | "paused"; phase?: PomodoroPhase; completed?: number; elapsed?: number };
  /** show the run-out notice as though it had just happened */
  finish?: { title: string; detail: string };
}

function fromSeed(seed: TimersSeed = {}): TimersModel {
  const sw = seed.stopwatch ?? {};
  const cd = seed.countdown ?? {};
  const po = seed.pomodoro ?? {};
  const phase = po.phase ?? "work";
  const duration = cd.duration ?? 5 * 60;
  return {
    mode: seed.mode ?? "stopwatch",
    stopwatch: { state: sw.state ?? "idle", banked: sw.elapsed ?? 0, startedAt: null, laps: sw.laps ?? [] },
    countdown: {
      state: cd.state ?? "idle",
      duration,
      banked: cd.state === "finished" ? duration : (cd.elapsed ?? 0),
      startedAt: null,
    },
    pomodoro: {
      phase,
      completed: po.completed ?? 0,
      timer: { state: po.state ?? "idle", duration: phaseDuration(phase), banked: po.elapsed ?? 0, startedAt: null },
    },
    finish: seed.finish ? { ...seed.finish, at: -Infinity } : null,
  };
}

export interface TimersController {
  model: TimersModel;
  mode: TimerMode;
  /** true while the current mode's timer is counting */
  isRunning: boolean;
  /** true while ANY timer is not idle — the notch keeps the resident chip up */
  isActive: boolean;
  setMode: (m: TimerMode) => void;
  /** play / pause for the current mode */
  primary: () => void;
  /** lap (stopwatch), a minute off (timer), skip the phase (focus) */
  secondary: () => void;
  reset: () => void;
  /** change the countdown's length while it is idle; clamped to 1 min – 12 h */
  adjust: (seconds: number) => void;
  /** @internal settle anything that has crossed zero — called by the views' clocks */
  settle: () => void;
}

/**
 * The timers' state, shared between the open surface and the chip — create it
 * once where both can see it and hand it to each.
 */
export function useTimers(seed?: TimersSeed, { autostart = true }: { autostart?: boolean } = {}): TimersController {
  const [model, setModel] = useState<TimersModel>(() => fromSeed(seed));
  const reduce = useReducedMotion();

  // Seeds that say "running" get their anchor after mount: the server and the
  // first client render agree on the seeded value, and only then does it move.
  useEffect(() => {
    if (!autostart || reduce) return;
    let cancelled = false;
    // Deferred a microtask so the anchor lands after the committed first render.
    queueMicrotask(() => {
      if (cancelled) return;
      const now = clock();
      setModel((m) => {
      const anchor = <T extends Run>(r: T): T => (r.state === "running" && r.startedAt === null ? { ...r, startedAt: now } : r);
      return {
        ...m,
        stopwatch: anchor(m.stopwatch),
        countdown: anchor(m.countdown),
        pomodoro: { ...m.pomodoro, timer: anchor(m.pomodoro.timer) },
        finish: m.finish && m.finish.at === -Infinity ? { ...m.finish, at: now } : m.finish,
      };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [autostart, reduce]);

  const act = useCallback((f: (m: TimersModel, now: number) => TimersModel) => {
    setModel((m) => {
      const now = clock();
      return f(settle(m, now), now);
    });
  }, []);

  const controller = useMemo<TimersController>(() => {
    const adjustBy = (m: TimersModel, step: number): TimersModel =>
      m.countdown.state !== "idle"
        ? m
        : { ...m, countdown: { ...m.countdown, duration: Math.min(12 * 3600, Math.max(60, m.countdown.duration + step)) } };
    return {
      model,
      mode: model.mode,
      isRunning: stateOf(model) === "running",
      isActive: (["stopwatch", "countdown", "pomodoro"] as const).some((k) => stateOf(model, k) !== "idle"),
      setMode: (mode) => setModel((m) => ({ ...m, mode })),
      primary: () =>
        act((m, now) => {
          if (m.mode === "stopwatch") return { ...m, stopwatch: toggle(m.stopwatch, now) };
          if (m.mode === "countdown") return { ...m, countdown: toggle(m.countdown, now), finish: null };
          return { ...m, pomodoro: { ...m.pomodoro, timer: toggle(m.pomodoro.timer, now) } };
        }),
      secondary: () =>
        act((m, now) => {
          if (m.mode === "stopwatch") {
            if (m.stopwatch.state !== "running") return m;
            return { ...m, stopwatch: { ...m.stopwatch, laps: [...m.stopwatch.laps, consumed(m.stopwatch, now)] } };
          }
          if (m.mode === "countdown") return adjustBy(m, -60);
          return { ...m, pomodoro: advance(m.pomodoro, now, false) };
        }),
      reset: () =>
        act((m) => {
          if (m.mode === "stopwatch") return { ...m, stopwatch: { state: "idle", banked: 0, startedAt: null, laps: [] } };
          if (m.mode === "countdown") return { ...m, countdown: newCountdown(m.countdown.duration), finish: null };
          return { ...m, pomodoro: { phase: "work", completed: 0, timer: newCountdown(POMODORO.work) } };
        }),
      adjust: (step) => act((m) => adjustBy(m, step)),
      settle: () => act((m) => m),
    };
  }, [model, act]);

  return controller;
}

// ─── the clock the views draw from ─────────────────────────────────────────

/**
 * `now`, advanced on animation frames only while `live` is true, the element
 * is on screen and the tab is visible. `step` is how often the picture can
 * actually change, so React re-renders at that rate rather than at 120 Hz.
 */
function useFrameClock(ref: RefObject<HTMLElement | null>, live: boolean, step: number, onFrame?: (now: number) => void) {
  const [now, setNow] = useState(0);
  const cb = useRef(onFrame);
  useEffect(() => {
    cb.current = onFrame;
  });

  useEffect(() => {
    // A fresh reading whenever `live` changes, so a stopped view shows the
    // value it stopped at rather than whatever the last frame caught.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setNow(clock());
    });
    if (!live)
      return () => {
        cancelled = true;
      };
    const el = ref.current;
    let onScreen = true;
    let visible = document.visibilityState === "visible";
    let raf = 0;
    let lastBucket = -1;
    const frame = () => {
      const t = clock();
      const bucket = Math.floor(t / step);
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        setNow(t);
        cb.current?.(t);
      }
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (onScreen && visible) raf = requestAnimationFrame(frame);
    };
    const io =
      el && "IntersectionObserver" in window
        ? new IntersectionObserver(([e]) => {
            onScreen = e.isIntersecting;
            sync();
          })
        : null;
    if (io && el) io.observe(el);
    const onVis = () => {
      visible = document.visibilityState === "visible";
      sync();
    };
    document.addEventListener("visibilitychange", onVis);
    sync();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref, live, step]);

  return now;
}

/** Tick while a timer is actually anchored and running, or while something is blinking. */
function isLive(m: TimersModel) {
  const anchored = (r: Run) => r.state === "running" && r.startedAt !== null;
  return anchored(m.stopwatch) || anchored(m.countdown) || anchored(m.pomodoro.timer);
}

/** false on the server and during hydration, true after — without an effect. */
const noop = () => () => {};
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

const ROUNDED: CSSProperties = { fontFamily: 'ui-rounded, "SF Pro Rounded", var(--font-system)' };

// ─── the open surface ──────────────────────────────────────────────────────

/**
 * The open surface, inside the notch's expanded shell. Pass a controller from
 * `useTimers()` to share state with <TimerChip/>; without one it keeps its own.
 */
export function Timers({
  timers,
  seed,
  width,
}: {
  /** shared state from useTimers(); omit and the surface keeps its own */
  timers?: TimersController;
  /** starting state when the surface keeps its own */
  seed?: TimersSeed;
  /** panel width in points, passed to ExpandedShell (default 360) */
  width?: number;
}) {
  const own = useTimers(timers ? undefined : seed);
  const t = timers ?? own;
  const m = t.model;
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const ref = useRef<HTMLDivElement>(null);

  const finishedBlink = m.mode === "countdown" && m.countdown.state === "finished" && !reduce;
  // Tenths want a fast tick; whole seconds do not; a blink needs samples well inside its half-period.
  const step = m.mode === "stopwatch" ? 0.05 : finishedBlink || urgencyOf(m, clock()) === "imminent" ? 0.08 : 0.2;
  const now = useFrameClock(ref, isLive(m) || finishedBlink, step, (n) => {
    if (needsSettle(m, n)) t.settle();
  });

  const urgency = urgencyOf(m, now);
  const alarm = urgency !== "calm";
  const heroOpacity = reduce ? 1 : blink(urgency, now);
  const state = stateOf(m);
  const running = state === "running";
  const canReset =
    m.mode === "stopwatch"
      ? m.stopwatch.state !== "idle"
      : m.mode === "countdown"
        ? m.countdown.state !== "idle"
        : m.pomodoro.timer.state !== "idle" || m.pomodoro.completed > 0;

  return (
    <ExpandedShell active="timer" width={width}>
      <div ref={ref} className="flex h-full flex-col items-center px-[20px] pb-[4px]">
        {/* mode picker */}
        <div role="group" aria-label="Timer mode" className="flex h-[20px] items-center gap-[3px]">
          {(["stopwatch", "countdown", "pomodoro"] as const).map((k) => {
            const on = k === m.mode;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => t.setMode(k)}
                className={clsx(
                  "relative h-[20px] rounded-full px-[9px] text-[11px] leading-none transition-colors duration-150",
                  // The chips sit side by side, so a finger gets the axis with
                  // room: down into the empty space, and only into half the 3pt
                  // gutter either side.
                  "[@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-y-[5px] [@media(pointer:coarse)]:before:-inset-x-[1.5px]",
                  on ? "bg-white/18 font-semibold text-white" : "font-normal text-white/45 hover:text-white/70",
                )}
              >
                {MODE_TITLE[k]}
              </button>
            );
          })}
        </div>

        {/* hero */}
        <div
          role="timer"
          aria-label={MODE_TITLE[m.mode]}
          className="mt-[4px] flex h-[42px] items-center justify-center gap-[12px]"
          style={{ opacity: heroOpacity }}
        >
          {m.mode === "stopwatch" ? (
            <Digits size={34}>{formatStopwatch(consumed(m.stopwatch, now))}</Digits>
          ) : m.mode === "countdown" ? (
            <>
              <Ring progress={progress(m.countdown, now)} tint={alarm ? "var(--color-bad)" : "var(--color-accent)"} />
              <Digits size={30} className={alarm ? "text-bad" : undefined}>
                {formatCountdown(remaining(m.countdown, now))}
              </Digits>
            </>
          ) : (
            <>
              <Ring
                progress={progress(m.pomodoro.timer, now)}
                tint={alarm ? "var(--color-bad)" : m.pomodoro.phase === "work" ? "var(--color-accent)" : "var(--color-good)"}
              />
              <Digits size={30} className={alarm ? "text-bad" : undefined}>
                {formatCountdown(remaining(m.pomodoro.timer, now))}
              </Digits>
            </>
          )}
        </div>

        {/* one supporting line, above the controls */}
        <div className="flex h-[20px] items-center justify-center">
          {m.mode === "stopwatch" ? (
            m.stopwatch.laps.length > 0 ? (
              <Caption>
                {`Lap ${m.stopwatch.laps.length}   ${formatStopwatch(
                  m.stopwatch.laps[m.stopwatch.laps.length - 1] - (m.stopwatch.laps[m.stopwatch.laps.length - 2] ?? 0),
                )}`}
              </Caption>
            ) : (
              <Caption>{m.stopwatch.state === "running" ? "Flag to record a lap" : " "}</Caption>
            )
          ) : m.mode === "countdown" ? (
            m.countdown.state === "idle" ? (
              <div className="flex gap-[5px]">
                {([["1m", 60], ["5m", 300], ["10m", 600], ["25m", 1500]] as const).map(([label, s]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => t.adjust(s)}
                    aria-label={`Add ${label.replace("m", " minutes").replace(/^1 minutes$/, "1 minute")}`}
                    className="rounded-full bg-white/16 px-[7px] py-[3px] text-[9.5px] leading-[12px] font-medium text-white/75 transition-colors hover:bg-white/24"
                  >
                    +{label}
                  </button>
                ))}
              </div>
            ) : (
              <Caption>{mounted ? `Ends at ${endsAt(remaining(m.countdown, now))}` : " "}</Caption>
            )
          ) : (
            <div className="flex items-center gap-[8px]">
              <div className="flex gap-[4px]" aria-label={`${m.pomodoro.completed % POMODORO.cycles} of ${POMODORO.cycles} focus blocks done`}>
                {Array.from({ length: POMODORO.cycles }, (_, i) => (
                  <span
                    key={i}
                    className={clsx(
                      "size-[5px] rounded-full",
                      i < m.pomodoro.completed % POMODORO.cycles ? "bg-accent" : "bg-white/22",
                    )}
                  />
                ))}
              </div>
              <span className={clsx("text-[10px] font-medium", m.pomodoro.phase === "work" ? "text-accent" : "text-good")}>
                {PHASE_TITLE[m.pomodoro.phase]}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* controls */}
        <div className="flex h-[26px] items-center gap-[8px]">
          <button
            type="button"
            onClick={t.primary}
            aria-label={running ? "Pause" : "Start"}
            className="relative grid h-[26px] w-[58px] place-items-center rounded-full bg-white/92 text-black transition-colors hover:bg-white [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-y-[2px] [@media(pointer:coarse)]:before:-inset-x-[3px]"
          >
            {running ? <PauseGlyph /> : <PlayGlyph />}
          </button>
          <Control
            onClick={t.secondary}
            label={m.mode === "stopwatch" ? "Lap" : m.mode === "countdown" ? "Take a minute off" : "Skip to the next phase"}
          >
            {m.mode === "stopwatch" ? <FlagGlyph /> : m.mode === "countdown" ? <MinusGlyph /> : <SkipGlyph />}
          </Control>
          {canReset ? (
            <Control onClick={t.reset} label="Reset">
              <ResetGlyph />
            </Control>
          ) : null}
        </div>
      </div>
    </ExpandedShell>
  );
}

function endsAt(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function Digits({ size, className, children }: { size: number; className?: string; children: string }) {
  return (
    <span
      className={clsx("tnum leading-none font-light whitespace-nowrap text-white", className)}
      style={{ ...ROUNDED, fontSize: size }}
      suppressHydrationWarning
    >
      {children}
    </span>
  );
}

function Caption({ children }: { children: string }) {
  return <p className="tnum text-[10px] whitespace-pre text-white/45">{children}</p>;
}

function Control({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative grid h-[26px] w-[34px] place-items-center rounded-[6px] bg-white/14 text-white/65 transition-colors hover:bg-white/20 [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-y-[2px] [@media(pointer:coarse)]:before:-inset-x-[3px]"
    >
      {children}
    </button>
  );
}

/** The progress ring: 38pt, a stroke of 11% of that, a round-capped arc from twelve o'clock. */
function Ring({ progress: p, tint }: { progress: number; tint: string }) {
  const side = 38;
  const line = Math.min(9, Math.max(3, side * 0.11));
  const r = (side - line) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={side} height={side} viewBox={`0 0 ${side} ${side}`} aria-hidden="true" className="shrink-0 -rotate-90">
      <circle cx={side / 2} cy={side / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth={line} />
      <circle
        cx={side / 2}
        cy={side / 2}
        r={r}
        fill="none"
        stroke={tint}
        strokeWidth={line}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0.001, p))}
        style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.2s linear" }}
      />
    </svg>
  );
}

// ─── the resident chip ─────────────────────────────────────────────────────

/**
 * TimerResidentView: what the notch keeps showing after you move away while a
 * timer exists — which timer, whether it is running, and how far along. Lay it
 * inside <Notch state="activity"> (227 × 78); it clears the camera housing
 * itself. Its 46pt of content gives SurfaceMetrics a scale of 0.8 (the floor),
 * so the Swift sizes appear here multiplied by 0.8 and rounded: 12→10, 23→18,
 * 26→21, 9→7. Renders nothing while every timer is idle.
 *
 * When a countdown has run out, or a focus block has just ended, it shows the
 * finished notice instead: a bell rocking four steps a second.
 */
export function TimerChip({
  timers,
  seed,
}: {
  /** shared state from useTimers() */
  timers?: TimersController;
  /** starting state when the chip keeps its own (benches) */
  seed?: TimersSeed;
}) {
  const own = useTimers(timers ? undefined : seed);
  const t = timers ?? own;
  const m = t.model;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const countdownDone = m.countdown.state === "finished" && m.mode === "countdown";
  const noticeFresh = m.finish !== null && (countdownDone || m.finish.at === -Infinity || clock() - m.finish.at < NOTICE_SECONDS);
  const bell = m.finish !== null && noticeFresh && !reduce;
  const step = m.mode === "stopwatch" && !bell ? 0.05 : bell ? 0.08 : 0.2;
  const now = useFrameClock(ref, isLive(m) || bell, step, (n) => {
    if (needsSettle(m, n)) t.settle();
  });

  const showNotice = m.finish !== null && (countdownDone || m.finish.at === -Infinity || now - m.finish.at < NOTICE_SECONDS);
  const urgency = urgencyOf(m, now);
  const alarm = urgency !== "calm";
  const running = stateOf(m) === "running";

  if (!t.isActive && !showNotice) return <div ref={ref} />;

  const label =
    m.mode === "stopwatch"
      ? formatStopwatch(consumed(m.stopwatch, now))
      : formatCountdown(remaining(m.mode === "countdown" ? m.countdown : m.pomodoro.timer, now));

  return (
    <div ref={ref} className="flex h-full flex-col font-[family-name:var(--font-system)]">
      <div className="h-[32px] shrink-0" />
      {showNotice && m.finish ? (
        <FinishedNotice title={m.finish.title} detail={m.finish.detail} now={now} still={!!reduce} />
      ) : (
        <div
          role="timer"
          aria-label={MODE_TITLE[m.mode]}
          className="flex flex-1 flex-col items-center justify-center gap-[2px] px-[8px] pb-[4px]"
          style={{ opacity: reduce ? 1 : blink(urgency, now) }}
        >
          <p
            className={clsx(
              "text-[10px] leading-[12px] font-semibold whitespace-nowrap",
              alarm ? "text-bad" : running ? "text-accent" : "text-white/55",
            )}
          >
            {running ? MODE_TITLE[m.mode] : `${MODE_TITLE[m.mode]} · paused`}
          </p>
          <div className="flex items-center gap-[7px]">
            <ModeGlyph
              mode={m.mode}
              className={clsx("size-[18px]", alarm ? "text-bad" : running ? "text-accent" : "text-white/50")}
            />
            <span
              className={clsx("tnum text-[21px] leading-[25px] font-medium whitespace-nowrap", alarm ? "text-bad" : "text-white")}
              style={ROUNDED}
              suppressHydrationWarning
            >
              {label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** TimerFinishedView: stepped, not tweened — lit two steps, dim two, the bell rocking about its top. */
function FinishedNotice({ title, detail, now, still }: { title: string; detail: string; now: number; still: boolean }) {
  const phase = Math.floor(now / 0.25);
  const lit = still || phase % 4 < 2;
  const tilt = still ? 0 : phase % 2 === 0 ? -13 : 13;
  return (
    <div
      className="flex flex-1 items-center justify-center gap-[9px] px-[8px] pb-[4px]"
      style={{ opacity: lit ? 1 : 0.4 }}
      role="status"
    >
      <BellGlyph className="size-[18px] shrink-0 text-accent" style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "50% 0" }} />
      <div className="min-w-0">
        <p className="truncate text-[10px] leading-[13px] font-semibold text-white">{title}</p>
        <p className="truncate text-[8px] leading-[10px] text-white/50">{detail}</p>
      </div>
    </div>
  );
}

// ─── glyphs (SF Symbols, redrawn) ──────────────────────────────────────────

function PlayGlyph() {
  return (
    <svg width="12" height="13" viewBox="0 0 12 13" aria-hidden="true">
      <path d="M1.6 1.4c0-.8.9-1.3 1.6-.9l8 5c.6.4.6 1.3 0 1.7l-8 5c-.7.4-1.6-.1-1.6-.9z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" aria-hidden="true">
      <rect x="0.8" y="0.5" width="3.4" height="12" rx="0.9" fill="currentColor" />
      <rect x="6.8" y="0.5" width="3.4" height="12" rx="0.9" fill="currentColor" />
    </svg>
  );
}

function FlagGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="0.9" y="0.6" width="1.3" height="11" rx="0.65" fill="currentColor" />
      <path d="M2.2 1.3C3.6.5 5 .7 6.3 1.2c1.4.6 2.8.9 4.6.2v6.2c-1.8.7-3.2.4-4.6-.2C5 6.9 3.6 6.7 2.2 7.5z" fill="currentColor" />
    </svg>
  );
}

function MinusGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="1" y="5.3" width="10" height="1.4" rx="0.7" fill="currentColor" />
    </svg>
  );
}

function SkipGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1.2 2c0-.6.7-1 1.2-.7l6.1 4c.5.3.5 1.1 0 1.4l-6.1 4c-.5.3-1.2-.1-1.2-.7z" fill="currentColor" />
      <rect x="9.3" y="1.2" width="1.6" height="9.6" rx="0.8" fill="currentColor" />
    </svg>
  );
}

function ResetGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M6.5 2.2A5 5 0 1 1 2.2 4.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M4.6 2.2 7.2.4v3.6z" fill="currentColor" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
}

function BellGlyph({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path
        d="M12 2.4c.7 0 1.2.5 1.2 1.2v.7a6.2 6.2 0 0 1 5 6.1v3.9l1.6 2.3c.4.6 0 1.4-.8 1.4H5c-.8 0-1.2-.8-.8-1.4l1.6-2.3v-3.9a6.2 6.2 0 0 1 5-6.1v-.7c0-.7.5-1.2 1.2-1.2zM9.6 19.2h4.8a2.4 2.4 0 0 1-4.8 0z"
        fill="currentColor"
      />
    </svg>
  );
}

/** stopwatch / timer / target, at the light weight the resident readout uses. */
function ModeGlyph({ mode, className }: { mode: TimerMode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className={className} aria-hidden="true">
      {mode === "stopwatch" ? (
        <>
          <circle cx="12" cy="13.4" r="8.6" />
          <path d="M10 2.6h4M12 2.6v2.2M18.6 6.4l1.3-1.3M12 13.4V8.6" />
          <circle cx="12" cy="13.4" r="0.9" fill="currentColor" stroke="none" />
        </>
      ) : mode === "countdown" ? (
        <>
          <path d="M12 3.4a8.6 8.6 0 1 1-6.1 2.5" />
          <path d="M12 3.4v3.4M12 12.2 7.6 7.8" />
          <circle cx="12" cy="12.2" r="0.9" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5.4" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
