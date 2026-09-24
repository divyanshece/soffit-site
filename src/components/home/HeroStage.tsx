"use client";

import {
  animate,
  motion,
  type MotionStyle,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { MacStage } from "@/components/notch/MacStage";
import { MenuBar } from "@/components/notch/MenuBar";
import { Notch } from "@/components/notch/Notch";
import { Spill } from "@/components/site/Spill";
import { Eyes } from "@/components/surfaces/Eyes";
import { Glance } from "@/components/surfaces/Glance";
import { LevelReadout } from "@/components/surfaces/Levels";
import { NowPlayingActivity, TRACKS } from "@/components/surfaces/NowPlaying";
import { directionSpring, HARDWARE, LIGHT_SPRING, NOTCH, outerWidth, type NotchState } from "@/lib/notch";
import { useHoverIntent } from "@/lib/useHoverIntent";
import { CompactMenuBar } from "./CompactMenuBar";
import { HERO_VOLUME, type HeroView, useInView, useNotchScript } from "./useNotchScript";

/** Stage height in points: the open glance (162) and a little room under it. */
const STAGE_HEIGHT = 186;
/** Below this stage width (points) MenuBar's status items overflow their half. */
const COMPACT_BELOW = 640;
/** Below this, the clock is what gives way; the eyes must never be the thing cut. */
const CLOCK_FROM = 1000;
/** How bright the light under the lip is in each state. */
const LIGHT: Record<NotchState, number> = { collapsed: 0.32, activity: 0.62, expanded: 1 };

/**
 * How big a point is on the page, by viewport width.
 *
 *   < 640     the stage is ~488pt wide, so the notch is a notch and not a
 *             speck: 0.74 at 360, 0.8 at 390, 1 from 488.
 *   640–1279  1: real size. The notch on the page is the size of yours.
 *   ≥ 1280    up to 1.25, so the open glance holds its own on a wide screen.
 */
function stageScale(w: number) {
  if (w < COMPACT_BELOW) return Math.min(1, w / 488);
  if (w < 1280) return 1;
  // Continuous at the breakpoint — 1 at 1280, 1.25 from 1440 — so dragging a
  // window across 1280 no longer pops the notch 11% wider in one pixel.
  return Math.min(1.25, 1 + ((w - 1280) / 160) * 0.25);
}

const subscribeNothing = () => () => {};

/**
 * The home page's hero: the top of a Mac screen, drawn in code, full-bleed
 * under the fascia so the fascia reads as the bezel the notch hangs from.
 *
 *   - The menu bar carries the googly eyes, following the visitor's pointer.
 *   - Rest the pointer on the notch and it opens to the glance (HoverIntent's
 *     rule: resting, not crossing). Touch and keyboard toggle it with a real
 *     button laid over the camera housing.
 *   - Left alone, it performs the lap in useNotchScript: a track that stays as
 *     the resident chip, volume presses that interrupt it, the glance over the
 *     top, then several seconds of real dormancy. It stops the moment the
 *     pointer is on the stage, and whenever the stage is off screen or the tab
 *     is hidden.
 *   - The Spill falls from the lip and follows it open; the same value is
 *     published as --lit (0–1) on the wrapper round `children`, so the
 *     headline under it can catch the light.
 *
 * With reduced motion nothing plays by itself: the notch rests open on the
 * glance, which is the script's last word anyway.
 */
export function HeroStage({ children }: { children?: ReactNode }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  // ── size ────────────────────────────────────────────────────────────────
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setPageWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const s = pageWidth ? stageScale(pageWidth) : 1;
  const designWidth = pageWidth ? pageWidth / s : 1152;
  const compact = designWidth < COMPACT_BELOW;

  // ── who is driving ──────────────────────────────────────────────────────
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const reducedPref = useReducedMotion();
  const reduced = mounted && !!reducedPref;
  const inView = useInView(wrapRef);
  const intent = useHoverIntent({ scale: s });
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);
  const busy = hovering || pinned || intent.engaged;

  // The script waits a moment after the visitor lets go, so it never snaps
  // shut in the face of someone who has only just moved away.
  const [settled, setSettled] = useState(true);
  useEffect(() => {
    if (busy) return;
    const id = window.setTimeout(() => setSettled(true), 1500);
    return () => window.clearTimeout(id);
  }, [busy]);
  const idle = settled && !busy;

  const beat = useNotchScript(mounted && !reduced && inView && idle);

  const open = pinned || intent.engaged || reduced;
  const state: NotchState = open ? "expanded" : beat.state;
  const view: HeroView = open ? { kind: "glance" } : beat.view;

  // ── the press ───────────────────────────────────────────────────────────
  // Every pointer type toggles, a mouse included: hover intent already holds
  // it open while the pointer rests there, so a click on top of that is
  // invisible — but a visitor who clicks the notch has to get something.
  const [pressed, setPressed] = useState(false);
  const onButtonClick = useCallback(() => {
    setSettled(false);
    setPinned((p) => !p);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => {
      if (!regionRef.current?.contains(e.target as Node)) setPinned(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [pinned]);

  // Hover intent is for the mouse only; a finger has its own rule (the button).
  const mouse =
    <E extends ReactPointerEvent>(fn: (e: E) => void) =>
    (e: E) => {
      if (e.pointerType === "mouse") fn(e);
    };

  // ── the light ───────────────────────────────────────────────────────────
  const box = NOTCH[state];
  // The lip is the edge the light leaks from, so it takes the same
  // direction-chosen spring the silhouette does and switches at the same
  // moment: bouncy on the way out, settled on the way back. LIGHT_SPRING is
  // the light's own, and stays slower than both.
  const lipW = useMotionValue(box.width * s);
  const lipY = useMotionValue(box.height * s);
  const light = useSpring(LIGHT[state], LIGHT_SPRING);
  const lastScale = useRef(s);
  useEffect(() => {
    // A resize is not a movement: jump. A change of state springs.
    const resized = lastScale.current !== s;
    lastScale.current = s;
    const to = (mv: typeof lipW, v: number) => {
      if (resized || mv.get() === v) {
        mv.jump(v);
        return undefined;
      }
      return animate(mv, v, directionSpring(mv.get(), v));
    };
    const running = [to(lipW, box.width * s), to(lipY, box.height * s)];
    // A press is acknowledged the way the app acknowledges anything: the light
    // under the lip steps up for as long as the button is held.
    light.set(LIGHT[state] + (pressed ? 0.14 : 0));
    return () => running.forEach((r) => r?.stop());
  }, [box, s, state, pressed, lipW, lipY, light]);
  // The lit line's corners take the new radius at once. Spill sizes the
  // line's box from `radius` only when it mounts, so it is keyed on it; its
  // light is driven entirely by the MotionValues passed in, so a remount is
  // invisible.
  const radius = box.bottom * s;
  // Quantised to twentieths before it is published: --lit repaints a 96px
  // headline's three shadows and two underlines, and twenty steps across a
  // transition are already finer than the eye reads on a value this low.
  const lit = useTransform(light, (v) =>
    Math.round(Math.max(0, Math.min(1, (v - LIGHT.collapsed) / (1 - LIGHT.collapsed))) * 20) / 20,
  );
  const lift = useTransform(
    lit,
    (v) => `linear-gradient(180deg, rgb(255 199 133 / ${(0.055 * v).toFixed(4)}) 0%, rgb(255 199 133 / 0) 100%)`,
  );

  // The region the pointer may be in; the notch itself is the hit shape.
  const region = { width: outerWidth(box) + 28, height: box.height + 18 };
  const tap = Math.max(HARDWARE.height, 44 / s);

  // ── what counts as being on the notch ───────────────────────────────────
  // The app does not hit-test the silhouette: NotchDisplayController
  // .geometryRejects() tests the bare hardware rect inset by −2pt while
  // nothing is drawn, and the drawn rect inset by −6pt once something is. The
  // region div is bigger than both — it has to be, because the 44pt tap button
  // hangs below the notch — so the intent is gated on coordinates instead,
  // which is what the app does too.
  const anchor = useRef({ cx: 0, top: 0 });
  const armed = useRef(false);
  // One rect read per entry rather than one per move: the notch is centred and
  // its top edge is the top of the stage, so neither moves while the pointer
  // is inside.
  const measureAnchor = () => {
    const r = regionRef.current?.getBoundingClientRect();
    if (r) anchor.current = { cx: r.left + r.width / 2, top: r.top };
  };
  const onNotch = (e: ReactPointerEvent) => {
    const pad = (state === "collapsed" ? 2 : 6) * s;
    const w = (state === "collapsed" ? HARDWARE.width : outerWidth(box)) * s;
    const h = (state === "collapsed" ? HARDWARE.height : box.height) * s;
    const { cx, top } = anchor.current;
    return (
      Math.abs(e.clientX - cx) <= w / 2 + pad && e.clientY >= top - pad && e.clientY <= top + h + pad
    );
  };
  const leaveNotch = () => {
    if (!armed.current) return;
    armed.current = false;
    intent.handlers.onPointerLeave();
  };

  return (
    <>
      <motion.div
        ref={wrapRef}
        className="relative"
        // The plane's top stop lifts towards lip light as the notch opens: the
        // room the light is in gets brighter, not just the light. It is written
        // as a background rather than a custom property so only this element's
        // paint is invalidated, not the whole drawn stage under it — and a
        // background is not a stacking context, so the Spill still screens onto
        // the plane instead of painting over it.
        style={{ backgroundImage: lift }}
        onPointerMove={mouse(() => {
          setHovering(true);
          setSettled(false);
        })}
        onPointerLeave={mouse(() => setHovering(false))}
      >
        {/* The stage is sized to a design width before it can measure; the
            clip keeps that first paint from widening the page on a phone. */}
        <div ref={measureRef} className="overflow-x-clip">
          <MacStage designWidth={designWidth} designHeight={STAGE_HEIGHT} wallpaper="none" maxScale={1.25}>
            {() => (
              <>
                {compact ? (
                  <CompactMenuBar
                    width={designWidth}
                    // Housing width, NOT the open notch's: the phone stage is
                    // only ~488pt wide, so reserving the open width leaves 24pt
                    // a side and drops the eyes and the app name entirely. The
                    // open notch covering the bar is what a real Mac does.
                    eyes={<Eyes />}
                  />
                ) : (
                  <MenuBar
                    width={designWidth}
                    // The hero's notch opens over the bar, so the bar keeps
                    // clear of the open notch's full outer width rather than
                    // just the camera housing. Reserved at rest as well, so
                    // nothing shuffles when it opens.
                    clear={outerWidth(NOTCH.expanded)}
                    eyes={<Eyes />}
                    showClock={designWidth >= CLOCK_FROM}
                  />
                )}
                <div
                  ref={regionRef}
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{ width: region.width, height: region.height }}
                  onPointerEnter={mouse((e) => {
                    measureAnchor();
                    if (!onNotch(e)) return;
                    armed.current = true;
                    intent.handlers.onPointerEnter(e);
                  })}
                  onPointerMove={mouse((e) => {
                    // Not armed yet: the pointer came in through the slop, or
                    // the page scrolled under it. Re-measure, then test.
                    if (!armed.current) {
                      measureAnchor();
                      if (!onNotch(e)) return;
                      armed.current = true;
                      intent.handlers.onPointerEnter(e);
                      return;
                    }
                    if (!onNotch(e)) return leaveNotch();
                    intent.handlers.onPointerMove(e);
                  })}
                  onPointerLeave={mouse(leaveNotch)}
                >
                  <Notch state={state} contentKey={keyOf(view)}>
                    <Surface view={view} />
                  </Notch>
                  <button
                    type="button"
                    aria-label="The notch"
                    aria-expanded={state === "expanded"}
                    onPointerDown={() => setPressed(true)}
                    onPointerUp={() => setPressed(false)}
                    onPointerCancel={() => setPressed(false)}
                    onPointerLeave={() => setPressed(false)}
                    onClick={onButtonClick}
                    className="absolute top-0 left-1/2 -translate-x-1/2 cursor-pointer rounded-b-[14px] bg-transparent focus-visible:outline-offset-0"
                    style={{ width: HARDWARE.width, height: tap }}
                  />
                </div>
              </>
            )}
          </MacStage>
        </div>
        <Spill key={radius} width={lipW} top={lipY} intensity={light} radius={radius} />
      </motion.div>
      <motion.div style={{ "--lit": lit } as unknown as MotionStyle}>{children}</motion.div>
    </>
  );
}

function keyOf(view: HeroView) {
  switch (view.kind) {
    case "track":
      return `track-${view.turn}`;
    case "volume":
      return "volume";
    case "glance":
      return "glance";
    default:
      return "none";
  }
}

function Surface({ view }: { view: HeroView }) {
  switch (view.kind) {
    case "track":
      return <NowPlayingActivity track={TRACKS[(view.turn + 1) % TRACKS.length]} playing />;
    case "volume":
      return <LevelReadout kind="volume" value={view.value} />;
    case "glance":
      return <Glance volume={HERO_VOLUME} />;
    default:
      return null;
  }
}
