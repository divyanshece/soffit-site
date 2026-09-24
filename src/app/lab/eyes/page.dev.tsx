"use client";

import type { ReactNode } from "react";
import { MacStage } from "@/components/notch/MacStage";
import { MenuBar } from "@/components/notch/MenuBar";
import { Eyes, EyesHero, type EyesProps } from "@/components/surfaces/Eyes";

// Eyes test bench — not linked from the site. Every state of the menu-bar eyes,
// a live pair, a pair on a short fuse that falls asleep in seconds, and the hero.

const STATES: { label: string; props: EyesProps }[] = [
  { label: "awake, following", props: {} },
  { label: "drowsy 0", props: { force: "drowsy", drowsiness: 0 } },
  { label: "drowsy 0.5", props: { force: "drowsy", drowsiness: 0.5 } },
  { label: "drowsy 1", props: { force: "drowsy", drowsiness: 1 } },
  { label: "asleep", props: { force: "asleep" } },
  { label: "tired (low battery)", props: { tired: true } },
  { label: "12pt", props: { size: 12 } },
  { label: "20pt", props: { size: 20 } },
];

export default function EyesLab() {
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-10">
      <section className="space-y-3" data-section="live">
        <h2 className="text-sm text-ink-2">In the menu bar, at app defaults</h2>
        <MacStage designWidth={760} designHeight={110}>
          {() => <MenuBar width={760} eyes={<Eyes />} />}
        </MacStage>
      </section>

      <section className="space-y-3" data-section="fuse">
        <h2 className="text-sm text-ink-2">Short fuse: drowsy after 3s still, asleep after 14s</h2>
        <MacStage designWidth={760} designHeight={110}>
          {() => <MenuBar width={760} eyes={<Eyes drowsyAfter={3} asleepAfter={14} />} />}
        </MacStage>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm text-ink-2">Every state</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-grid="states">
          {STATES.map((s) => (
            <Tile key={s.label} label={s.label}>
              <Eyes {...s.props} />
            </Tile>
          ))}
        </div>
      </section>

      <section className="space-y-3" data-section="hero">
        <h2 className="text-sm text-ink-2">Hero</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "live", el: <EyesHero /> },
            { label: "drowsy", el: <EyesHero drowsy={0.45} /> },
            { label: "asleep", el: <EyesHero asleep /> },
          ].map((h) => (
            <figure key={h.label} className="space-y-2">
              <div className="grid h-40 place-items-center rounded-md border border-hair bg-plane-mid">{h.el}</div>
              <figcaption className="text-xs text-ink-3">{h.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="space-y-2">
      <MacStage designWidth={100} designHeight={40} maxScale={4}>
        {() => (
          <div
            className="absolute inset-x-0 top-0 flex items-center justify-center"
            style={{ height: 32, background: "rgb(0 0 0 / 0.26)" }}
          >
            {children}
          </div>
        )}
      </MacStage>
      <figcaption className="text-xs text-ink-3">{label}</figcaption>
    </figure>
  );
}
