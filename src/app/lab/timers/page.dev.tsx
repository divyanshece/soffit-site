"use client";

import { useSyncExternalStore } from "react";
import { MacStage } from "@/components/notch/MacStage";
import { MenuBar } from "@/components/notch/MenuBar";
import { Notch } from "@/components/notch/Notch";
import { TimerChip, Timers, type TimersSeed, useTimers } from "@/components/surfaces/Timers";
import { useHoverIntent } from "@/lib/useHoverIntent";

const noop = () => () => {};

// Timers test bench — every state of the surface and the chip. Not linked from the site.
// ?still=1 keeps seeded "running" timers from moving, for side-by-side screenshots.

const OPEN: [string, TimersSeed][] = [
  ["stopwatch, idle", {}],
  ["stopwatch, running", { stopwatch: { state: "running", elapsed: 1.3 } }],
  ["stopwatch, laps", { stopwatch: { state: "running", elapsed: 74.6, laps: [31.2, 58.9] } }],
  ["stopwatch, paused", { stopwatch: { state: "paused", elapsed: 5.1 } }],
  ["timer, idle", { mode: "countdown" }],
  ["timer, running", { mode: "countdown", countdown: { state: "running", duration: 600, elapsed: 212 } }],
  ["timer, last seconds", { mode: "countdown", countdown: { state: "running", duration: 60, elapsed: 56 } }],
  ["timer, finished", { mode: "countdown", countdown: { state: "finished", duration: 300 } }],
  ["focus, idle", { mode: "pomodoro" }],
  ["focus, running", { mode: "pomodoro", pomodoro: { state: "running", completed: 2, elapsed: 431 } }],
  ["focus, break", { mode: "pomodoro", pomodoro: { state: "paused", phase: "shortBreak", completed: 3, elapsed: 70 } }],
];

const CHIPS: [string, TimersSeed][] = [
  ["stopwatch, paused", { stopwatch: { state: "paused", elapsed: 5.1 } }],
  ["stopwatch, running", { stopwatch: { state: "running", elapsed: 12.4 } }],
  ["timer, running", { mode: "countdown", countdown: { state: "running", duration: 300, elapsed: 41 } }],
  ["timer, last seconds", { mode: "countdown", countdown: { state: "running", duration: 60, elapsed: 57 } }],
  ["focus, running", { mode: "pomodoro", pomodoro: { state: "running", completed: 1, elapsed: 90 } }],
  [
    "timer, finished",
    { mode: "countdown", countdown: { state: "finished", duration: 300 }, finish: { title: "Timer finished", detail: "05:00 elapsed" } },
  ],
];

export default function TimersBench() {
  // null on the server; the query is only read in the browser.
  const still = useSyncExternalStore<boolean | null>(
    noop,
    () => new URLSearchParams(window.location.search).has("still"),
    () => null,
  );
  if (still === null) return null;
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-10">
      <section className="space-y-3">
        <h2 className="text-sm text-ink-2">Live: rest on the notch to open it, move away and the chip stays</h2>
        <MacStage designWidth={760} designHeight={230}>
          {(scale) => <LiveStage scale={scale} />}
        </MacStage>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm text-ink-2">Open</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {OPEN.map(([label, seed]) => (
            <figure key={label} data-case={label}>
              <MacStage designWidth={590} designHeight={230}>
                {() => (
                  <div className="absolute top-0 left-1/2">
                    <Notch state="expanded" contentKey="timer">
                      <Bench seed={seed} still={still} />
                    </Notch>
                  </div>
                )}
              </MacStage>
              <figcaption className="mt-2 text-xs text-ink-3">{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm text-ink-2">Resident chip</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CHIPS.map(([label, seed]) => (
            <figure key={label} data-chip={label}>
              <MacStage designWidth={590} designHeight={230}>
                {() => (
                  <div className="absolute top-0 left-1/2">
                    <Notch state="activity" contentKey="chip">
                      <ChipBench seed={seed} still={still} />
                    </Notch>
                  </div>
                )}
              </MacStage>
              <figcaption className="mt-2 text-xs text-ink-3">{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}

function Bench({ seed, still }: { seed: TimersSeed; still: boolean }) {
  const timers = useTimers(seed, { autostart: !still });
  return <Timers timers={timers} />;
}

function ChipBench({ seed, still }: { seed: TimersSeed; still: boolean }) {
  const timers = useTimers(seed, { autostart: !still });
  return <TimerChip timers={timers} />;
}

/** The whole behaviour: hover opens the surface, leaving collapses to the chip while a timer exists. */
function LiveStage({ scale }: { scale: number }) {
  const timers = useTimers();
  const intent = useHoverIntent({ scale });
  const state = intent.engaged ? "expanded" : timers.isActive ? "activity" : "collapsed";
  return (
    <>
      <MenuBar width={760} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pb-8" {...intent.handlers}>
        <div className="px-8" style={{ width: 460 }}>
          <Notch state={state} contentKey={state === "expanded" ? "timers" : "chip"}>
            {state === "expanded" ? <Timers timers={timers} /> : <TimerChip timers={timers} />}
          </Notch>
        </div>
      </div>
      <button
        type="button"
        onClick={intent.toggle}
        className="absolute bottom-3 left-4 rounded border border-white/30 px-2 py-0.5 font-mono text-[11px] text-white/80"
      >
        {intent.engaged ? "close" : "open"}
      </button>
    </>
  );
}
