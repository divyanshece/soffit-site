"use client";

import type { ReactNode } from "react";
import { Notch } from "@/components/notch/Notch";
import { Clipboard } from "@/components/surfaces/Clipboard";
import { Glance } from "@/components/surfaces/Glance";
import { NowPlaying } from "@/components/surfaces/NowPlaying";
import { TimerChip, Timers, useTimers } from "@/components/surfaces/Timers";
import { type NotchState } from "@/lib/notch";
import { Band, Stage, StageBar, type StageSize } from "./Stage";

/*
 * The open surfaces, each held open on its own slice of screen so the visitor
 * can use it straight away: nothing here waits for a hover. Every one is the
 * shared surface component, untouched; this file only frames them.
 *
 * Phone sizes are the expanded notch's outer width (360 + 2 × 40 = 440pt) plus
 * nothing, so the surface is as large as a 390px screen allows.
 */

const PHONE_OPEN: StageSize = { width: 440, height: 186 };

function Hung({ state, contentKey, children }: { state: NotchState; contentKey: string; children?: ReactNode }) {
  return (
    <div className="absolute inset-x-0 top-0">
      <Notch state={state} contentKey={contentKey}>
        {children}
      </Notch>
    </div>
  );
}

/** Clipboard: search it, arrow through it, pin a row. */
export function ClipboardDemo() {
  return (
    <Stage size={{ width: 1000, height: 212 }} tablet={{ width: 600, height: 206 }} phone={PHONE_OPEN} maxScale={1.44}>
      {(w) => (
        <>
          <StageBar width={w} app="Code" menus={["File", "Edit", "Selection", "View"]} showClock={w >= 800} />
          <Hung state="expanded" contentKey="clipboard">
            <Clipboard />
          </Hung>
        </>
      )}
    </Stage>
  );
}

/** Now playing, paused, so the first thing that moves is the visitor pressing play. */
export function NowPlayingDemo() {
  return (
    <Stage size={{ width: 600, height: 206 }} phone={PHONE_OPEN} wallpaper="dark" maxScale={1.3}>
      {(w) => (
        <>
          <StageBar width={w} app="Music" menus={["File", "Edit", "Song"]} showClock={false} />
          <Hung state="expanded" contentKey="music">
            <NowPlaying initialPlaying={false} />
          </Hung>
        </>
      )}
    </Stage>
  );
}

/** The glance: what the notch shows when nothing else is going on. */
export function GlanceDemo() {
  return (
    <Stage size={{ width: 600, height: 206 }} phone={PHONE_OPEN} maxScale={1.3}>
      {(w) => (
        <>
          <StageBar width={w} menus={["File", "Edit", "View"]} showClock={false} />
          <Hung state="expanded" contentKey="status">
            <Glance battery={80} onPower volume={45} />
          </Hung>
        </>
      )}
    </Stage>
  );
}

/**
 * Timers: the open surface, and beside it the same notch closed. One timer
 * state drives both, so starting the stopwatch on the left sets the resident
 * chip on the right reading it back — as the collapsed notch does in the app.
 * It starts on a stopwatch already run to 00:05.1 and stopped, so the closed
 * notch has something to hold before anyone touches it.
 */
export function TimersDemo() {
  const timers = useTimers({ stopwatch: { state: "paused", elapsed: 5.1 } });
  const chip: NotchState = timers.isActive ? "activity" : "collapsed";
  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
      <figure>
        <Stage size={{ width: 660, height: 206 }} phone={PHONE_OPEN} wallpaper="dark" maxScale={1.3}>
          {(w) => (
            <>
              <StageBar width={w} app="Clock" menus={["File", "Edit"]} showClock={false} />
              <Hung state="expanded" contentKey="timer">
                <Timers timers={timers} />
              </Hung>
            </>
          )}
        </Stage>
        <figcaption className="sr-only">The timers, open.</figcaption>
      </figure>
      <figure>
        <Stage size={{ width: 320, height: 104 }} phone={{ width: 300, height: 96 }} wallpaper="dark" maxScale={1.3}>
          {() => (
            <>
              <Band />
              <Hung state={chip} contentKey="chip">
                <TimerChip timers={timers} />
              </Hung>
            </>
          )}
        </Stage>
        <figcaption className="mt-3 text-[13px] leading-[1.45] text-ink-3" aria-live="polite">
          {timers.isActive ? "Closed, and still reading it back." : "Closed. Start a timer and it stays here."}
        </figcaption>
      </figure>
    </div>
  );
}
