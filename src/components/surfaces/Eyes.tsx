"use client";

import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useEffect, useRef } from "react";

/**
 * The googly eyes that live in the menu bar — GooglyEyes.swift, EyeTracker.swift
 * and EyesStatusItem.swift ported.
 *
 * The maths is the app's, line for line: EyeGeometry.pupilOffset (saturating
 * pull within 90pt, convergence within 220pt), the frame-rate independent
 * easing, BlinkClock's randomised interval, a wink on the side of the button
 * pressed, and the Drowse model (heavy drifting lids, a downward wander, a nod
 * every 8.5s, the two eyes drifting apart) once the pointer has been still.
 *
 * Like the app's Core Animation layers, nothing here re-renders React per frame:
 * one shared rAF loop reads every pair's position, then writes transforms to
 * refs. It runs only while something is moving; between blinks it sleeps on a
 * timeout until the next one is due, while drowsy it ticks at the app's 12Hz,
 * and asleep, offscreen or in a hidden tab it does not run at all.
 *
 * Coordinates are y-down throughout (the page's), where the Swift is y-up; the
 * only place that matters is Drowse.gaze, whose "down" is negated here.
 */

// ── The app's numbers ───────────────────────────────────────────────────────

/** EyeStyle.crossEyedWithin */
const CROSS_EYED_WITHIN = 220;
/** EyeGeometry: the pull saturates at this distance. */
const PULL_SATURATES = 90;
/** BlinkClock.duration */
const BLINK = 0.16;
/** EyeTracker.restAfter */
const REST_AFTER = 0.9;
/** EyeTracker.drowseRate */
const DROWSE_RATE = 1 / 12;
/** Drowse */
const BREATH_PERIOD = 5.5;
const NOD_EVERY = 8.5;
const NOD_DURATION = 1.9;
const SETTLE_IN = 1.2;
/** The app's default pupil colour and its low-battery sclera. */
const PUPIL = "#111318";
const SCLERA_TIRED = "rgb(255 209 204)";

export type ClickBlink = "both" | "matchingSide" | "random";

type Point = { x: number; y: number };
type Wakefulness = { stage: "awake" } | { stage: "drowsy"; gone: number; onset: number } | { stage: "asleep" };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** EyeStyle.blinkRange */
function blinkRange(interval: number, variation: number): [number, number] {
  const mean = clamp(interval, 0.5, 600);
  const wander = clamp(variation, 0, 0.9);
  const low = Math.max(0.4, mean * (1 - wander));
  const high = Math.max(low + 0.15, mean * (1 + wander));
  return [low, high];
}

/** Drowse.wakefulness — `idle` in seconds since the pointer last moved. */
function wakefulness(idle: number, drowsyAfter: number, asleepAfter: number): Wakefulness {
  const sag = Math.max(1, drowsyAfter);
  if (idle <= sag) return { stage: "awake" };
  const under = Math.max(sag + 5, asleepAfter);
  if (idle >= under) return { stage: "asleep" };
  return { stage: "drowsy", gone: clamp((idle - sag) / (under - sag), 0, 1), onset: idle - sag };
}

/** Drowse.lid — 0 open to 1 shut. */
function drowseLid(now: number, drowsiness: number, secondsSinceOnset = Infinity) {
  const gone = clamp(drowsiness, 0, 1);
  const base = 0.34 + 0.42 * gone;
  const breath = 0.05 * Math.sin((2 * Math.PI * now) / BREATH_PERIOD);
  let nod = 0;
  const phase = now % NOD_EVERY;
  if (phase < NOD_DURATION) {
    const fall = Math.sin((Math.PI * phase) / NOD_DURATION);
    nod = (0.97 - base) * fall * fall * (0.35 + 0.65 * gone);
  }
  const settling = clamp(secondsSinceOnset / SETTLE_IN, 0, 1);
  return clamp((base + breath + Math.max(0, nod)) * settling, 0, 1);
}

/** Drowse.gaze, returned y-down. `eye` is 0 left, 1 right. */
function drowseGaze(now: number, drowsiness: number, travel: number, eye: 0 | 1): Point {
  const gone = clamp(drowsiness, 0, 1);
  const energy = 1 - 0.45 * gone;
  const x = (Math.sin((2 * Math.PI * now) / 11) * 0.55 + Math.sin((2 * Math.PI * now) / 6.3) * 0.2) * energy;
  let y = Math.sin((2 * Math.PI * now) / 9 + 1.1) * 0.28 * energy;
  y -= 0.34 + 0.3 * gone;
  const apart = (eye === 0 ? -1 : 1) * 0.12 * gone;
  return { x: travel * (x + apart), y: -travel * y };
}

/** EyeGeometry.pupilOffset. `dx`, `dy` are already in the app's points. */
function pupilOffset(dx: number, dy: number, travel: number, crossEyed: boolean): Point {
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.001) return { x: 0, y: 0 };
  let scale = 1;
  if (crossEyed && distance < CROSS_EYED_WITHIN) scale = 1 + (1 - distance / CROSS_EYED_WITHIN) * 0.35;
  const reach = Math.min(travel * scale, travel * 1.35);
  const magnitude = reach * Math.min(1, distance / PULL_SATURATES);
  return { x: (dx / distance) * magnitude, y: (dy / distance) * magnitude };
}

/** EyeGeometry.eased — frame-rate independent. */
function eased(from: Point, to: Point, speed: number, dt: number): Point {
  const k = 1 - Math.pow(1 - clamp(speed, 0.05, 0.99), dt * 60);
  return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
}

/** BlinkClock.lid(forBlinkStartedAt:now:) */
function blinkCurve(start: number, now: number): number | null {
  const elapsed = now - start;
  if (elapsed < 0 || elapsed >= BLINK) return null;
  const half = BLINK / 2;
  return elapsed < half ? elapsed / half : 1 - (elapsed - half) / half;
}

/** EyesStatusItem's layout, at any size. Above the menu bar's 20pt the gaps scale with the eye. */
function geometry(size: number, separation: number) {
  const d = size;
  const base = clamp(d, 9, 20);
  const k = d / base;
  const gap = clamp(base * separation * 0.6, 1, 10) * k;
  const inset = 2 * k;
  const pupil = d * 0.46;
  return {
    d,
    gap,
    inset,
    pupil,
    width: d * 2 + gap + inset * 2,
    travel: d / 2 - pupil / 2 - d * 0.06,
    stroke: Math.max(0.5, d * 0.05),
  };
}
type Geometry = ReturnType<typeof geometry>;

// ── The one pointer, the one clock ──────────────────────────────────────────

const now = () => performance.now() / 1000;

const pointer = { x: 0, y: 0, known: false, movedAt: 0 };
const engines = new Set<Engine>();
let raf = 0;
let timeout = 0;
let listening = false;

function onMove(e: PointerEvent) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.known = true;
  pointer.movedAt = now();
  for (const eng of engines) eng.wake();
}
function onDown(e: PointerEvent) {
  onMove(e);
  const t = now();
  for (const eng of engines) eng.clicked(e.button === 2, t);
}
function onScroll() {
  // The page moved under a still pointer: to the eyes that is the pointer moving.
  pointer.movedAt = now();
  for (const eng of engines) eng.wake();
}
function onVisibility() {
  if (document.visibilityState === "visible") plan();
  else halt();
}

function listen(on: boolean) {
  if (on === listening) return;
  listening = on;
  const opts = { passive: true, capture: true } as AddEventListenerOptions;
  const f = (type: string, fn: EventListener) =>
    on ? window.addEventListener(type, fn, opts) : window.removeEventListener(type, fn, opts);
  f("pointermove", onMove as EventListener);
  f("pointerdown", onDown as EventListener);
  f("scroll", onScroll);
  if (on) document.addEventListener("visibilitychange", onVisibility);
  else document.removeEventListener("visibilitychange", onVisibility);
  if (on && pointer.movedAt === 0) pointer.movedAt = now();
}

function halt() {
  if (raf) cancelAnimationFrame(raf);
  if (timeout) clearTimeout(timeout);
  raf = 0;
  timeout = 0;
}

/** Schedule the next frame for whichever pair is due soonest — or nothing. */
function plan() {
  halt();
  if (document.visibilityState !== "visible") return;
  let due = Infinity;
  for (const eng of engines) if (eng.onScreen) due = Math.min(due, eng.due);
  if (due === Infinity) return;
  const wait = due - now();
  if (wait <= 1 / 60) raf = requestAnimationFrame(frame);
  else
    timeout = window.setTimeout(() => {
      timeout = 0;
      raf = requestAnimationFrame(frame);
    }, wait * 1000);
}

function frame() {
  raf = 0;
  const t = now();
  const due: Engine[] = [];
  for (const eng of engines) if (eng.onScreen && eng.due <= t + 1 / 30) due.push(eng);
  // Every read, then every write, so no pair forces layout for another.
  for (const eng of due) eng.measure();
  for (const eng of due) eng.due = t + eng.tick(t);
  plan();
}

// ── One pair ────────────────────────────────────────────────────────────────

type Settings = {
  geo: Geometry;
  drowsyAfter: number;
  asleepAfter: number;
  sleeps: boolean;
  blinks: boolean;
  blinkInterval: number;
  blinkVariation: number;
  followSpeed: number;
  crossesEyes: boolean;
  reactsToClicks: boolean;
  clickBlink: ClickBlink;
  tired: boolean;
  force?: "drowsy" | "asleep";
  drowsiness: number;
};

type Parts = {
  root: HTMLElement;
  sclera: [HTMLElement, HTMLElement];
  pupils: [HTMLElement, HTMLElement];
  lids: [HTMLElement, HTMLElement];
};

class Engine {
  due = Infinity;
  onScreen = false;

  private lastTick = 0;
  private pupil: [Point, Point] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  private lid: [number, number] = [0, 0];
  private nextBlinkAt = 0;
  private blinkStartedAt: number | null = null;
  private wink: [number | null, number | null] = [null, null];
  private forcedSince = 0;
  private forced: Settings["force"];
  private emitted: [Point, Point, number, number, boolean] | null = null;
  private stage = "";
  private mode: "live" | "drowse" = "live";
  /** Pointer relative to each eye, in the app's points, read by measure(). */
  private rel: [Point, Point] | null = null;

  constructor(
    private parts: Parts,
    private settings: Settings,
  ) {
    const t = now();
    this.lastTick = t;
    this.nextBlinkAt = t + this.randomInterval();
    this.forced = settings.force;
    this.forcedSince = t;
  }

  update(settings: Settings) {
    if (settings.force !== this.forced) {
      this.forced = settings.force;
      this.forcedSince = now();
    }
    this.settings = settings;
    this.wake();
  }

  wake() {
    if (!this.onScreen) return;
    const t = now();
    if (this.due > t) {
      this.due = t;
      if (!raf) plan();
    }
  }

  setOnScreen(on: boolean) {
    this.onScreen = on;
    if (on) {
      this.lastTick = now();
      this.due = 0;
    }
    plan();
  }

  /** ClickBlink, from EyeTracker.clicked. */
  clicked(rightButton: boolean, t: number) {
    const s = this.settings;
    if (!s.reactsToClicks || !this.onScreen) return;
    if (s.clickBlink === "both") this.wink = [t, t];
    else if (s.clickBlink === "matchingSide") this.wink[rightButton ? 1 : 0] = t;
    else this.wink[Math.random() < 0.5 ? 1 : 0] = t;
    this.wake();
  }

  measure() {
    if (!pointer.known) {
      this.rel = null;
      return;
    }
    const { geo } = this.settings;
    const r = this.parts.root.getBoundingClientRect();
    if (r.width === 0) return;
    // CSS pixels → the app's points: undo any stage scaling, then measure in
    // units of an 18pt eye so a bigger pair behaves like the menu-bar one.
    const toPt = (geo.width / r.width) * (18 / geo.d);
    const unit = r.width / geo.width;
    const cy = r.top + r.height / 2;
    const lx = r.left + (geo.inset + geo.d / 2) * unit;
    const rx = r.left + (geo.inset + geo.d + geo.gap + geo.d / 2) * unit;
    this.rel = [
      { x: (pointer.x - lx) * toPt, y: (pointer.y - cy) * toPt },
      { x: (pointer.x - rx) * toPt, y: (pointer.y - cy) * toPt },
    ];
  }

  private randomInterval() {
    const [lo, hi] = blinkRange(this.settings.blinkInterval, this.settings.blinkVariation);
    return lo + Math.random() * (hi - lo);
  }

  /** EyeTracker.tick. Returns seconds until it next wants to run. */
  tick(t: number): number {
    const s = this.settings;
    const { travel } = s.geo;
    const dt = Math.max(0.001, t - this.lastTick);
    this.lastTick = t;

    const idle = t - pointer.movedAt;
    let w: Wakefulness;
    if (s.force === "asleep") w = { stage: "asleep" };
    else if (s.force === "drowsy") w = { stage: "drowsy", gone: clamp(s.drowsiness, 0, 1), onset: t - this.forcedSince };
    else w = s.sleeps ? wakefulness(idle, s.drowsyAfter, s.asleepAfter) : { stage: "awake" };

    if (w.stage !== this.stage) {
      this.stage = w.stage;
      this.parts.root.dataset.stage = w.stage;
    }

    const heldLid = w.stage === "drowsy" ? drowseLid(t, w.gone, w.onset) : w.stage === "asleep" ? 1 : null;

    // BlinkClock: retime, then drive.
    const [, hi] = blinkRange(s.blinkInterval, s.blinkVariation);
    if (this.blinkStartedAt === null && this.nextBlinkAt > t + hi) this.nextBlinkAt = t + this.randomInterval();
    let bothLid = 0;
    if (heldLid === null && s.blinks) {
      if (this.blinkStartedAt !== null) {
        const v = blinkCurve(this.blinkStartedAt, t);
        if (v === null) {
          this.blinkStartedAt = null;
          this.nextBlinkAt = t + this.randomInterval();
        } else bothLid = v;
      } else if (t >= this.nextBlinkAt) {
        this.blinkStartedAt = t;
      }
    }
    const resting = s.tired ? 0.32 : 0;

    const targets: [number, number] = [0, 0];
    for (const i of [0, 1] as const) {
      let winkLid = 0;
      const started = this.wink[i];
      if (started !== null) {
        const v = blinkCurve(started, t);
        if (v === null) this.wink[i] = null;
        else winkLid = v;
      }
      targets[i] = Math.max(heldLid ?? 0, bothLid, winkLid, resting);
    }
    const lk = Math.min(1, dt * 14);
    this.lid[0] += (targets[0] - this.lid[0]) * lk;
    this.lid[1] += (targets[1] - this.lid[1]) * lk;

    let target: [Point, Point];
    if (w.stage === "awake") {
      target = this.rel
        ? [
            pupilOffset(this.rel[0].x, this.rel[0].y, travel, s.crossesEyes),
            pupilOffset(this.rel[1].x, this.rel[1].y, travel, s.crossesEyes),
          ]
        : [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
          ];
    } else if (w.stage === "drowsy") {
      target = [drowseGaze(t, w.gone, travel, 0), drowseGaze(t, w.gone, travel, 1)];
    } else {
      target = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ];
    }
    const follow = w.stage === "awake" ? s.followSpeed : Math.min(s.followSpeed, 0.18);
    this.pupil = [eased(this.pupil[0], target[0], follow, dt), eased(this.pupil[1], target[1], follow, dt)];

    // At the drowse's 12Hz the compositor fills in between ticks; live, nothing may lag.
    const mode = w.stage === "drowsy" ? "drowse" : "live";
    if (mode !== this.mode) {
      this.mode = mode;
      const tr = mode === "drowse" ? `transform ${DROWSE_RATE}s linear` : "none";
      for (const el of [...this.parts.pupils, ...this.parts.lids]) el.style.transition = tr;
    }
    if (this.changed()) this.write();

    const settled =
      Math.hypot(this.pupil[0].x - target[0].x, this.pupil[0].y - target[0].y) < 0.05 &&
      Math.abs(this.lid[0] - targets[0]) < 0.01 &&
      Math.abs(this.lid[1] - targets[1]) < 0.01 &&
      this.blinkStartedAt === null &&
      this.wink[0] === null &&
      this.wink[1] === null;

    if (w.stage === "drowsy") return DROWSE_RATE;
    if (w.stage === "asleep") return settled ? Infinity : 0;
    if (!settled || idle <= REST_AFTER) return 0;
    // Resting: sleep until the next blink is due, or until the drowse begins.
    let next = Infinity;
    if (s.blinks) next = Math.max(0, this.nextBlinkAt - t);
    if (s.sleeps && !s.force) next = Math.min(next, Math.max(0, Math.max(1, s.drowsyAfter) - idle + 0.01));
    return next;
  }

  private changed() {
    const e = this.emitted;
    if (!e) return true;
    const [l, r] = this.pupil;
    return (
      Math.hypot(l.x - e[0].x, l.y - e[0].y) > 0.02 ||
      Math.hypot(r.x - e[1].x, r.y - e[1].y) > 0.02 ||
      Math.abs(this.lid[0] - e[2]) > 0.003 ||
      Math.abs(this.lid[1] - e[3]) > 0.003 ||
      this.settings.tired !== e[4]
    );
  }

  private write() {
    const { pupils, lids, sclera } = this.parts;
    for (const i of [0, 1] as const) {
      const p = this.pupil[i];
      pupils[i].style.transform = `translate3d(${p.x.toFixed(3)}px, ${p.y.toFixed(3)}px, 0)`;
      const a = this.lid[i];
      lids[i].style.opacity = a > 0.01 ? "1" : "0";
      lids[i].style.transform = `scaleY(${a.toFixed(4)})`;
      sclera[i].style.background = this.settings.tired ? SCLERA_TIRED : "#fff";
    }
    this.emitted = [{ ...this.pupil[0] }, { ...this.pupil[1] }, this.lid[0], this.lid[1], this.settings.tired];
  }

  /** Put everything back to the still pose, for when the loop stops for good. */
  rest(pose: Pose) {
    this.pupil = [{ ...pose.pupils[0] }, { ...pose.pupils[1] }];
    this.lid = [pose.lid, pose.lid];
    for (const el of [...this.parts.pupils, ...this.parts.lids]) el.style.transition = "none";
    this.mode = "live";
    this.write();
  }
}

// ── The still pose: server render, reduced motion, and the first frame ─────

type Pose = { pupils: [Point, Point]; lid: number; stage: "awake" | "drowsy" | "asleep" };

function stillPose(s: Pick<Settings, "geo" | "force" | "drowsiness" | "tired">): Pose {
  if (s.force === "asleep") return { pupils: [{ x: 0, y: 0 }, { x: 0, y: 0 }], lid: 1, stage: "asleep" };
  if (s.force === "drowsy") {
    // Drowse at rest: the base lid and the downward look, without the breath, drift or nod.
    const g = clamp(s.drowsiness, 0, 1);
    const down = s.geo.travel * (0.34 + 0.3 * g);
    const apart = s.geo.travel * 0.12 * g;
    return {
      pupils: [
        { x: -apart, y: down },
        { x: apart, y: down },
      ],
      lid: 0.34 + 0.42 * g,
      stage: "drowsy",
    };
  }
  return { pupils: [{ x: 0, y: 0 }, { x: 0, y: 0 }], lid: s.tired ? 0.32 : 0, stage: "awake" };
}

// ── The component ───────────────────────────────────────────────────────────

export type EyesProps = {
  /** Eye diameter in points. 18 is the app's default; the app allows 9–20 in the menu bar. */
  size?: number;
  /** Gap between the eyes as a fraction of their diameter (EyeStyle.separation). */
  separation?: number;
  /** Seconds the pointer must be still before the lids start to sag. App default 150. */
  drowsyAfter?: number;
  /** Seconds still before they are properly asleep. App default 420; at least drowsyAfter + 5. */
  asleepAfter?: number;
  /** Whether they get drowsy and fall asleep at all. */
  sleeps?: boolean;
  /** Scheduled blinking. */
  blinks?: boolean;
  /** Mean seconds between blinks (app default 4.95, "Now and then"). */
  blinkInterval?: number;
  /** How far either side of the mean a blink may fall, as a fraction (default 0.515). */
  blinkVariation?: number;
  /** 0 lazy drift, 1 snaps to the pointer (default 0.55). */
  followSpeed?: number;
  /** Converge on a pointer within 220pt. */
  crossesEyes?: boolean;
  /** Wink on a click anywhere on the page. */
  reactsToClicks?: boolean;
  /** Which eye winks: the side of the button pressed (default), both, or either at random. */
  clickBlink?: ClickBlink;
  /** Low battery: bloodshot, lids a third closed. */
  tired?: boolean;
  /** Hold a state regardless of the pointer, for demonstration. */
  force?: "drowsy" | "asleep";
  /** How far gone a forced drowse is, 0 first sag to 1 about to go under. Default 0.4. */
  drowsiness?: number;
  /**
   * Accessible name. Left out, it follows the state the eyes are actually in:
   * under prefers-reduced-motion the engine never starts, so they are a drawing
   * and are named as one. Pass null for purely decorative use (aria-hidden).
   */
  label?: string | null;
  className?: string;
};

export function Eyes({
  size = 18,
  separation = 0.34,
  drowsyAfter = 150,
  asleepAfter = 420,
  sleeps = true,
  blinks = true,
  blinkInterval = 4.95,
  blinkVariation = 0.515,
  followSpeed = 0.55,
  crossesEyes = true,
  reactsToClicks = true,
  clickBlink = "matchingSide",
  tired = false,
  force,
  drowsiness = 0.4,
  label,
  className,
}: EyesProps) {
  const reduce = usePrefersReducedMotion();
  const geo = geometry(size, separation);
  const settings: Settings = {
    geo,
    drowsyAfter,
    asleepAfter,
    sleeps,
    blinks,
    blinkInterval,
    blinkVariation,
    followSpeed,
    crossesEyes,
    reactsToClicks,
    clickBlink,
    tired,
    force,
    drowsiness,
  };
  const pose = stillPose(settings);

  const root = useRef<HTMLSpanElement>(null);
  const sclera = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)] as const;
  const pupils = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)] as const;
  const lids = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)] as const;
  const engine = useRef<Engine | null>(null);
  const latest = useRef(settings);

  // Keep the newest settings where the engine can reach them; declared first so it runs first.
  useEffect(() => {
    latest.current = settings;
  });

  // Start once per mount (and per motion preference); settings reach it through update().
  useEffect(() => {
    const el = root.current;
    if (!el || reduce !== false) return;
    const parts: Parts = {
      root: el,
      sclera: [sclera[0].current!, sclera[1].current!],
      pupils: [pupils[0].current!, pupils[1].current!],
      lids: [lids[0].current!, lids[1].current!],
    };
    const eng = new Engine(parts, latest.current);
    engine.current = eng;
    engines.add(eng);
    listen(true);
    const io = new IntersectionObserver(([e]) => eng.setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => {
      io.disconnect();
      engines.delete(eng);
      engine.current = null;
      eng.rest(stillPose(latest.current));
      el.dataset.stage = stillPose(latest.current).stage;
      if (engines.size === 0) {
        listen(false);
        halt();
      } else plan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  // Settings changed: hand them over and let it run a frame.
  useEffect(() => {
    engine.current?.update(latest.current);
  });

  // The default name has to describe what is on screen. With the engine stopped
  // nothing follows anything.
  const name = label === undefined ? (reduce ? "Googly eyes, at rest" : "Googly eyes, following the pointer") : label;

  const { d, gap, inset, pupil, width, stroke } = geo;
  const scleraFill = tired ? SCLERA_TIRED : "#fff";
  const eyeAt = (i: 0 | 1) => inset + i * (d + gap);

  return (
    <span
      ref={root}
      role={name ? "img" : undefined}
      aria-label={name ?? undefined}
      aria-hidden={name ? undefined : true}
      data-stage={pose.stage}
      className={className}
      style={{ position: "relative", display: "inline-block", flex: "none", width, height: d }}
    >
      {([0, 1] as const).map((i) => (
        <span key={i} aria-hidden="true">
          {/* The white, with the app's 22% rim straddling its edge as a CAShapeLayer stroke does. */}
          <span
            ref={sclera[i]}
            style={{
              position: "absolute",
              left: eyeAt(i),
              top: 0,
              width: d,
              height: d,
              borderRadius: "50%",
              background: scleraFill,
              boxShadow: `0 0 0 ${stroke / 2}px rgb(0 0 0 / 0.22), inset 0 0 0 ${stroke / 2}px rgb(0 0 0 / 0.22)`,
            }}
          />
          {/* The socket clips pupil and lid to the eye, so a fast flick cannot leave the rim. */}
          <span
            style={{
              position: "absolute",
              left: eyeAt(i),
              top: 0,
              width: d,
              height: d,
              borderRadius: "50%",
              overflow: "hidden",
              isolation: "isolate",
            }}
          >
            <span
              ref={pupils[i]}
              style={{
                position: "absolute",
                left: (d - pupil) / 2,
                top: (d - pupil) / 2,
                width: pupil,
                height: pupil,
                borderRadius: "50%",
                background: PUPIL,
                transform: `translate3d(${pose.pupils[i].x}px, ${pose.pupils[i].y}px, 0)`,
              }}
            />
            {/* The lid comes down from the top, as a lid does. */}
            <span
              ref={lids[i]}
              style={{
                position: "absolute",
                left: -0.5,
                top: -0.5,
                width: d + 1,
                height: d + 1,
                background: "#000",
                transformOrigin: "50% 0",
                transform: `scaleY(${pose.lid})`,
                opacity: pose.lid > 0.01 ? 1 : 0,
              }}
            />
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * The same eyes at showpiece size, for a page to put front and centre.
 * `drowsy` holds them nodding off (true, or how far gone, 0–1); `asleep` shuts them.
 */
export function EyesHero({
  size = 64,
  drowsy,
  asleep,
  ...rest
}: Omit<EyesProps, "force" | "drowsiness"> & { drowsy?: boolean | number; asleep?: boolean }) {
  const force = asleep ? "asleep" : drowsy !== undefined && drowsy !== false ? "drowsy" : undefined;
  const drowsiness = typeof drowsy === "number" ? drowsy : 0.4;
  return <Eyes size={size} force={force} drowsiness={drowsiness} {...rest} />;
}
