"use client";

import { useState } from "react";
import { MacStage } from "@/components/notch/MacStage";
import { MenuBar } from "@/components/notch/MenuBar";
import { Notch } from "@/components/notch/Notch";
import {
  ChargeReadout,
  type ChargeKind,
  LevelKeys,
  type LevelKind,
  LevelReadout,
  type OutputKind,
  useLevels,
} from "@/components/surfaces/Levels";

// Levels test bench — not linked from the site. Every state of the activity
// readouts, plus the function keys driving a live notch.

const LEVELS: { label: string; kind: LevelKind; value: number; muted?: boolean; available?: boolean; output?: { name: string; kind: OutputKind } }[] = [
  { label: "volume 0", kind: "volume", value: 0 },
  { label: "volume 1/16", kind: "volume", value: 1 / 16 },
  { label: "volume 5/16", kind: "volume", value: 5 / 16 },
  { label: "volume 8/16", kind: "volume", value: 8 / 16 },
  { label: "volume 12/16", kind: "volume", value: 12 / 16 },
  { label: "volume 16/16", kind: "volume", value: 1 },
  { label: "muted at 50%", kind: "volume", value: 0.5, muted: true },
  { label: "AirPods", kind: "volume", value: 10 / 16, output: { name: "AirPods Pro", kind: "airPods" } },
  { label: "headphones", kind: "volume", value: 6 / 16, output: { name: "External Headphones", kind: "headphones" } },
  { label: "AirPlay, no control", kind: "volume", value: 0.5, available: false, output: { name: "Living Room", kind: "airPlay" } },
  { label: "brightness 4/16", kind: "brightness", value: 4 / 16 },
  { label: "brightness 12/16", kind: "brightness", value: 12 / 16 },
];

const CHARGES: { kind: ChargeKind; percent: number }[] = [
  { kind: "connected", percent: 80 },
  { kind: "holding", percent: 80 },
  { kind: "charged", percent: 100 },
  { kind: "disconnected", percent: 64 },
  { kind: "low", percent: 9 },
];

export default function LevelsLab() {
  const [replay, setReplay] = useState(0);
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-10">
      <Live />

      <section className="space-y-4">
        <h2 className="text-sm text-ink-2">Every level state</h2>
        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3" data-grid="levels">
          {LEVELS.map((l) => (
            <Tile key={l.label} label={l.label}>
              <LevelReadout kind={l.kind} value={l.value} muted={l.muted} available={l.available} output={l.output} />
            </Tile>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm text-ink-2">Every charge state</h2>
          <button type="button" onClick={() => setReplay((n) => n + 1)} className="rounded border border-hair px-3 py-1 text-sm">
            Replay
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3" data-grid="charges">
          {CHARGES.map((c) => (
            <Tile key={`${c.kind}-${replay}`} label={c.kind}>
              <ChargeReadout kind={c.kind} percent={c.percent} />
            </Tile>
          ))}
        </div>
      </section>
    </main>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="space-y-2">
      <MacStage designWidth={280} designHeight={96} maxScale={3}>
        {() => (
          <div className="absolute inset-x-0 top-0">
            <Notch state="activity" contentKey={label}>
              {children}
            </Notch>
          </div>
        )}
      </MacStage>
      <figcaption className="text-xs text-ink-3">{label}</figcaption>
    </figure>
  );
}

function Live() {
  const levels = useLevels();
  const [arrows, setArrows] = useState<LevelKind>("volume");
  const [charge, setCharge] = useState({ on: false, n: 0, percent: 62 });
  const { state, kind, visible } = levels;

  const content = charge.n > 0 && !visible ? "charge" : kind;
  const open = visible || charge.n > 0;

  return (
    <section className="space-y-5">
      <MacStage designWidth={620} designHeight={150}>
        {() => (
          <>
            <MenuBar width={620} menus={["File", "Edit", "View"]} />
            <div className="absolute inset-x-0 top-0">
              <Notch state={open ? "activity" : "collapsed"} contentKey={content === "charge" ? `charge-${charge.n}` : content}>
                {content === "charge" ? (
                  <ChargeReadout percent={charge.percent} charging={charge.on} />
                ) : (
                  <LevelReadout kind={kind} value={kind === "volume" ? state.volume : state.brightness} muted={state.muted} />
                )}
              </Notch>
            </div>
          </>
        )}
      </MacStage>
      <div className="flex flex-wrap items-center gap-4">
        <LevelKeys
          onPress={(k, fine) => {
            setCharge((c) => ({ ...c, n: 0 }));
            levels.press(k, fine);
          }}
          arrows={arrows}
          announce={levels.announce}
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="rounded border border-hair px-3 py-1" onClick={() => setArrows(arrows === "volume" ? "brightness" : "volume")}>
            Arrows drive {arrows}
          </button>
          <button
            type="button"
            className="rounded border border-hair px-3 py-1"
            onClick={() => setCharge((c) => ({ on: !c.on, n: c.n + 1, percent: c.percent }))}
          >
            {charge.on ? "Unplug" : "Plug in"}
          </button>
          <button
            type="button"
            className="rounded border border-hair px-3 py-1"
            onClick={() => setCharge((c) => ({ ...c, n: Math.max(1, c.n), percent: Math.min(100, c.percent + 7) }))}
          >
            +7%
          </button>
          <button type="button" className="rounded border border-hair px-3 py-1" onClick={() => setCharge((c) => ({ ...c, n: 0 }))}>
            Close
          </button>
        </div>
      </div>
      <p className="tnum text-xs text-ink-3" data-probe>
        volume {state.volume.toFixed(4)} brightness {state.brightness.toFixed(4)} muted {String(state.muted)} shown {String(visible)} ({kind})
      </p>
    </section>
  );
}
