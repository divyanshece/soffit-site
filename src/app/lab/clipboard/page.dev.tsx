"use client";

import { useState } from "react";
import { MacStage } from "@/components/notch/MacStage";
import { MenuBar } from "@/components/notch/MenuBar";
import { Notch } from "@/components/notch/Notch";
import { CLIPBOARD_SEED, Clipboard, type ClipboardEntry } from "@/components/surfaces/Clipboard";

// Clipboard surface test bench — not linked from the site.

const FOUR = CLIPBOARD_SEED.slice(0, 4);
const PINNED: ClipboardEntry[] = CLIPBOARD_SEED.map((e) => (e.id === "c4" ? { ...e, pinned: true } : e));
const KINDS: ClipboardEntry[] = [
  { id: "k1", text: "Screenshot", kind: "image", source: "Screenshot" },
  { id: "k2", text: "Soffit.dmg", kind: "files", source: "Finder" },
  { id: "k3", text: "https://example.com/notes", source: "Safari" },
  { id: "k4", text: "\n\n   first line after blank lines\nsecond line", source: "Notes" },
];

const STATES: { name: string; items?: ClipboardEntry[]; query?: string; focus?: boolean }[] = [
  { name: "open (matches reference/clipboard-open.png)", items: FOUR, focus: true },
  { name: "full seed", items: CLIPBOARD_SEED },
  { name: "filtered: “com”", query: "com" },
  { name: "pinned row", items: PINNED },
  { name: "payload kinds", items: KINDS },
  { name: "no matches", query: "zzz" },
  { name: "empty history", items: [] },
];

export default function ClipboardLab() {
  const [log, setLog] = useState<string>("");
  return (
    <main className="mx-auto max-w-5xl space-y-10 p-4 sm:p-10">
      <p className="font-mono text-[12px] text-ink-2" data-log>
        last paste: {log || "none"}
      </p>
      {STATES.map((s, i) => (
        <section key={s.name} className="space-y-2" data-state={i}>
          <h2 className="text-sm text-ink-2">{s.name}</h2>
          <MacStage designWidth={710} designHeight={250}>
            {() => (
              <>
                <MenuBar width={710} app="Code" menus={["Terminal", "Window", "Help"]} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2">
                  <Notch state="expanded" contentKey="clipboard">
                    <Clipboard
                      items={s.items}
                      initialQuery={s.query}
                      autoFocus={s.focus}
                      onPaste={(e) => setLog(e.text)}
                    />
                  </Notch>
                </div>
              </>
            )}
          </MacStage>
        </section>
      ))}
    </main>
  );
}
