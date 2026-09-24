"use client";

import { useEffect, useState } from "react";
import { MacStage } from "@/components/notch/MacStage";
import { MenuBar } from "@/components/notch/MenuBar";
import { Notch } from "@/components/notch/Notch";
import { EQUALISER_NOTE, Equaliser } from "@/components/surfaces/Equaliser";
import { NowPlaying, NowPlayingActivity, TRACKS, type Track } from "@/components/surfaces/NowPlaying";
import type { NotchState } from "@/lib/notch";
import { useHoverIntent } from "@/lib/useHoverIntent";

// Now playing test bench — every state of the surface. Not linked from the site.
export default function NowPlayingLab() {
  return (
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-10">
      <Section label="Live: rest on the notch to open; next, previous or play/pause, then leave, shows the activity">
        <MacStage designWidth={560} designHeight={220}>{() => <Live />}</MacStage>
      </Section>

      <Section label="Expanded, playing">
        <MacStage designWidth={560} designHeight={200}>
          {() => (
            <Frame state="expanded">
              <NowPlaying />
            </Frame>
          )}
        </MacStage>
      </Section>

      <Section label="Expanded, paused near the end of a long title">
        <MacStage designWidth={560} designHeight={200}>
          {() => (
            <Frame state="expanded">
              <NowPlaying
                initialPlaying={false}
                initialPosition={170}
                tracks={[{ title: "A Very Long Title That Will Not Fit In The Column", artist: "The Lanterne Quartet", duration: 185, art: "rooms" }]}
              />
            </Frame>
          )}
        </MacStage>
      </Section>

      <div className="grid gap-6 sm:grid-cols-2">
        {(
          [
            ["Activity: new track", { track: TRACKS[1] }],
            ["Activity: play pressed", { track: TRACKS[0], transport: "play" }],
            ["Activity: pause pressed", { track: TRACKS[0], transport: "pause", playing: false }],
            ["Activity: resident, paused", { track: TRACKS[2], playing: false }],
          ] as const
        ).map(([label, props]) => (
          <Section key={label} label={label}>
            <MacStage designWidth={320} designHeight={110}>
              {() => (
                <Frame state="activity" width={320}>
                  <NowPlayingActivity {...props} />
                </Frame>
              )}
            </MacStage>
          </Section>
        ))}
      </div>

      <Section label={EQUALISER_NOTE}>
        <div className="flex items-end gap-10 rounded-lg bg-black p-6">
          <Equaliser playing width={48} height={40} />
          <Equaliser playing={false} width={48} height={40} />
          <Equaliser playing width={12} height={10} />
        </div>
      </Section>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="text-sm text-ink-2">{label}</p>
      {children}
    </section>
  );
}

function Frame({ state, width = 560, children }: { state: NotchState; width?: number; children: React.ReactNode }) {
  return (
    <>
      <MenuBar width={width} menus={["File", "Edit"]} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <Notch state={state} contentKey={state}>
          {children}
        </Notch>
      </div>
    </>
  );
}

/** The flow as the app runs it: the player on hover, the readout for a moment after. */
function Live() {
  const intent = useHoverIntent({});
  const [flash, setFlash] = useState<{ track: Track; transport?: "play" | "pause"; token: number } | null>(null);
  const [last, setLast] = useState<Track>(TRACKS[0]);

  useEffect(() => {
    if (!flash || intent.engaged) return;
    const id = window.setTimeout(() => setFlash(null), 2400);
    return () => window.clearTimeout(id);
  }, [flash, intent.engaged]);

  const state: NotchState = intent.engaged ? "expanded" : flash ? "activity" : "collapsed";
  return (
    <>
      <MenuBar width={560} menus={["File", "Edit"]} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 px-8 pb-8" {...intent.handlers}>
        <div style={{ width: 460 }}>
          <Notch state={state} contentKey={state === "activity" ? `a${flash?.token}` : state}>
            {state === "expanded" ? (
              <NowPlaying
                onTrackChange={(t) => {
                  setLast(t);
                  setFlash({ track: t, token: Date.now() });
                }}
                onTransport={(tr) => setFlash({ track: last, transport: tr, token: Date.now() })}
              />
            ) : flash ? (
              <NowPlayingActivity track={flash.track} transport={flash.transport} playing={flash.transport !== "pause"} />
            ) : null}
          </Notch>
        </div>
      </div>
    </>
  );
}
