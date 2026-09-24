"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import type { NotchState } from "@/lib/notch";

/**
 * What the hero's notch does when nobody is touching it.
 *
 * The shape of the lap is Presentation.settle (Presentation.swift:255-268):
 * when an activity ends the notch does not go dark, it falls back to whatever
 * is RESIDENT — here, the track that is playing — and only goes dormant when
 * there is nothing left to carry. Half of what Soffit is is that the closed
 * notch keeps holding state, so the lap has to show both halves:
 *
 *   dormant → a track announces itself and stays as the resident chip →
 *   volume presses interrupt it and it settles back → the glance opens over
 *   the chip and closes onto it → residency clears → a long, genuine dormancy.
 *
 * Two rules from the app are kept literally: `activityGap` (0.12s of the
 * smaller shape between two consecutive activities, so a burst cannot strobe)
 * and `hideAfter` (1.3s from the LAST press before a level readout goes).
 *
 * Residency is bounded on purpose. It holds for two beats, the lap ends with
 * more than four seconds at zero — nothing drawn, nothing running — and the
 * equaliser inside the chip is on screen for under a third of the lap. A
 * status layer that is always showing something is a widget.
 *
 * Every hold is in milliseconds. Volume steps are sixteenths (SystemLevel's 16
 * steps); the run turns the volume DOWN but stops at a quarter rather than at
 * mute, so the glance that follows agrees with it and the hero never
 * demonstrates the sound switched off.
 */
export type HeroView =
  | { kind: "none" }
  | { kind: "track"; turn: number }
  | { kind: "volume"; value: number }
  | { kind: "glance" };

export interface Beat {
  state: NotchState;
  view: HeroView;
  hold: number;
}

const NONE: HeroView = { kind: "none" };

/** Where the volume run stops, as a percentage — what the glance then reads. */
export const HERO_VOLUME = 25;

const SCRIPT: Beat[] = [
  // dormant: nothing resident, nothing drawn
  { state: "collapsed", view: NONE, hold: 4200 },
  // a track changes, introduces itself, and stays: this is the resident chip
  { state: "activity", view: { kind: "track", turn: 0 }, hold: 2800 },
  // Presentation.Configuration.activityGap, 0.12s of the smaller shape
  { state: "collapsed", view: NONE, hold: 120 },
  // four presses of volume-down interrupt it
  { state: "activity", view: { kind: "volume", value: 7 / 16 }, hold: 520 },
  { state: "activity", view: { kind: "volume", value: 6 / 16 }, hold: 420 },
  { state: "activity", view: { kind: "volume", value: 5 / 16 }, hold: 420 },
  { state: "activity", view: { kind: "volume", value: 4 / 16 }, hold: 1300 },
  // …and it settles back onto the chip rather than going dark
  { state: "activity", view: { kind: "track", turn: 0 }, hold: 1200 },
  // the glance opens over the chip
  { state: "expanded", view: { kind: "glance" }, hold: 3400 },
  // and closes back onto it
  { state: "activity", view: { kind: "track", turn: 0 }, hold: 900 },
];

/** The pose a stopped script shows: dormant. */
export const REST: Beat = SCRIPT[0];

/**
 * Where the first lap starts: the glance. The payoff beat used to be ten
 * seconds into the lap, so a visitor who gave the page five seconds saw a
 * black notch and a pill for an invented song. It now does its job inside the
 * first second, then joins the lap where it left off.
 */
const OPENS_ON = SCRIPT.findIndex((b) => b.view.kind === "glance");
const OPENS_AFTER = 900;

/**
 * Plays SCRIPT on a chain of timeouts while `running`, looping. Stopping
 * returns the notch to rest at once and the next run starts from the top.
 * Each lap moves the track on by one, so the readout is never the same song
 * twice in a row. One timeout is pending at a time, none when stopped.
 */
export function useNotchScript(running: boolean): Beat {
  const [beat, setBeat] = useState<Beat>(REST);
  const lap = useRef(0);

  useEffect(() => {
    if (!running) return;
    // The first beat shown is the glance; from there the lap runs in order.
    let i = OPENS_ON - 1;
    const show = (b: Beat) =>
      setBeat(b.view.kind === "track" ? { ...b, view: { kind: "track", turn: lap.current } } : b);
    let id = window.setTimeout(function next() {
      i = (i + 1) % SCRIPT.length;
      if (i === 0) lap.current += 1;
      const b = SCRIPT[i];
      show(b);
      id = window.setTimeout(next, b.hold);
    }, OPENS_AFTER);
    return () => {
      window.clearTimeout(id);
      setBeat(REST);
    };
  }, [running]);

  return running ? beat : REST;
}

/**
 * True while the element is at least partly on screen AND the tab is visible.
 * False on the server and until the first observation, so nothing starts
 * before mount.
 */
export function useInView(ref: RefObject<Element | null>): boolean {
  const [onScreen, setOnScreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const vis = () => setPageVisible(document.visibilityState === "visible");
    vis();
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, [ref]);

  return onScreen && pageVisible;
}
