"use client";

import { useState } from "react";
import { MacStage } from "@/components/notch/MacStage";
import { MenuBar } from "@/components/notch/MenuBar";
import { Notch } from "@/components/notch/Notch";
import { Glance } from "@/components/surfaces/Glance";
import type { NotchState } from "@/lib/notch";
import { useHoverIntent } from "@/lib/useHoverIntent";

// Foundation test bench — not linked from the site.
export default function Lab() {
  const [forced, setForced] = useState<NotchState | null>(null);
  return (
    <main className="mx-auto max-w-5xl space-y-10 p-10">
      <div className="flex gap-3 text-sm">
        {(["collapsed", "activity", "expanded"] as const).map((s) => (
          <button key={s} onClick={() => setForced(s)} className="rounded border border-hair px-3 py-1">
            {s}
          </button>
        ))}
        <button onClick={() => setForced(null)} className="rounded border border-hair px-3 py-1">hover</button>
      </div>
      <MacStage>
        {(scale) => <Stage scale={scale} forced={forced} />}
      </MacStage>
    </main>
  );
}

function Stage({ scale, forced }: { scale: number; forced: NotchState | null }) {
  const intent = useHoverIntent({ scale, trackSpeed: true });
  const state: NotchState = forced ?? (intent.engaged ? "expanded" : "collapsed");
  return (
    <>
      <MenuBar width={760} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pb-6" {...intent.handlers}>
        <div className="px-8" style={{ width: 460 }}>
          <Notch state={state} contentKey="glance">
            <Glance />
          </Notch>
        </div>
      </div>
      <p className="absolute bottom-3 left-4 font-mono text-[11px] text-white/70">
        {intent.phase} · {Math.round(intent.speed)} pt/s
      </p>
    </>
  );
}
