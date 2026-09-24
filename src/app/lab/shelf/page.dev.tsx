"use client";

import { type ReactNode, useState } from "react";
import { MacStage } from "@/components/notch/MacStage";
import { MenuBar } from "@/components/notch/MenuBar";
import { Notch } from "@/components/notch/Notch";
import {
  addToShelf,
  DraggableFile,
  type FileKind,
  FileThumb,
  Shelf,
  ShelfDropTarget,
  type ShelfFile,
  useShelfDrop,
} from "@/components/surfaces/Shelf";
import type { NotchState } from "@/lib/notch";
import { useHoverIntent } from "@/lib/useHoverIntent";

// Shelf test bench — not linked from the site.

const SAMPLE: ShelfFile[] = [
  { id: "a", name: "Screenshot 2026-09-18 at 16.01.12.png", kind: "screenshot" },
  { id: "b", name: "Q3 invoice 0932.pdf", kind: "pdf" },
  { id: "c", name: "IMG_4127.HEIC", kind: "image" },
  { id: "d", name: "Soffit.app.zip", kind: "zip" },
  { id: "e", name: "Brand assets", kind: "folder" },
  { id: "f", name: "release-notes.txt", kind: "text" },
];

const LOOSE: { name: string; kind: FileKind }[] = [
  { name: "IMG_4130.HEIC", kind: "image" },
  { name: "Lease agreement.pdf", kind: "pdf" },
  { name: "Exports", kind: "folder" },
  { name: "build-1.4.2.zip", kind: "zip" },
];

export default function ShelfLab() {
  return (
    <main className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-10">
      <Live />

      <section className="grid gap-8 md:grid-cols-2">
        <Still label="Empty">
          <Shelf items={[]} />
        </Still>
        <Still label="Empty, file held over the notch">
          <ShelfDropTarget />
        </Still>
        <Still label="Three files">
          <Shelf items={SAMPLE.slice(0, 3)} onItemsChange={() => {}} />
        </Still>
        <Still label="Six files, strip scrolls" id="still-six">
          <Shelf items={SAMPLE} onItemsChange={() => {}} />
        </Still>
        <Still label="Selecting, nothing ticked">
          <Shelf items={SAMPLE.slice(0, 4)} onItemsChange={() => {}} defaultSelecting />
        </Still>
        <Still label="Selecting, two ticked">
          <Shelf items={SAMPLE.slice(0, 4)} onItemsChange={() => {}} defaultSelecting defaultSelection={["a", "c"]} />
        </Still>
        <Still label="Selecting, all ticked">
          <Shelf items={SAMPLE.slice(0, 3)} onItemsChange={() => {}} defaultSelecting defaultSelection={["a", "b", "c"]} />
        </Still>
        <Still label="Files, another held over the notch">
          <ShelfDropTarget items={SAMPLE.slice(1, 4)} />
        </Still>
      </section>

      <section className="flex flex-wrap gap-6">
        {(["image", "screenshot", "pdf", "text", "folder", "zip"] as const).map((k) => (
          <figure key={k} className="text-center">
            <div className="size-24 bg-black p-1">
              <FileThumb kind={k} />
            </div>
            <figcaption className="mt-2 font-mono text-[11px] text-ink-3">{k}</figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}

function Live() {
  const [items, setItems] = useState<ShelfFile[]>(SAMPLE.slice(0, 4));
  const [pinned, setPinned] = useState(true);
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm text-ink-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          keep open
        </label>
        <button className="rounded border border-hair px-3 py-1" onClick={() => setItems(SAMPLE.slice(0, 4))}>
          reset
        </button>
        <button className="rounded border border-hair px-3 py-1" onClick={() => setItems([])}>
          empty
        </button>
      </div>
      <MacStage designWidth={760} designHeight={230}>
        {(scale) => <LiveStage scale={scale} items={items} setItems={setItems} pinned={pinned} />}
      </MacStage>
      <div className="flex flex-wrap gap-3" id="loose-files">
        {LOOSE.map((f) => (
          <DraggableFile key={f.name} name={f.name} kind={f.kind} />
        ))}
      </div>
    </section>
  );
}

function LiveStage({
  scale,
  items,
  setItems,
  pinned,
}: {
  scale: number;
  items: ShelfFile[];
  setItems: (f: (i: ShelfFile[]) => ShelfFile[]) => void;
  pinned: boolean;
}) {
  const intent = useHoverIntent({ scale });
  const drop = useShelfDrop((file) => setItems((i) => addToShelf(i, file)));
  const open = pinned || intent.engaged || drop.receiving;
  const state: NotchState = open ? "expanded" : "collapsed";
  return (
    <>
      <MenuBar width={760} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pb-6" {...intent.handlers} {...drop.props} id="drop-zone">
        <div className="px-8" style={{ width: 460 }}>
          <Notch state={state} contentKey="shelf">
            <Shelf items={items} onItemsChange={(n) => setItems(() => n)} receiving={drop.receiving} />
          </Notch>
        </div>
      </div>
    </>
  );
}

function Still({ label, id, children }: { label: string; id?: string; children: ReactNode }) {
  return (
    <figure id={id}>
      <MacStage designWidth={440} designHeight={190}>
        {() => (
          <>
            <MenuBar width={440} menus={[]} showClock={false} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <Notch state="expanded" contentKey="shelf">
                {children}
              </Notch>
            </div>
          </>
        )}
      </MacStage>
      <figcaption className="mt-2 text-sm text-ink-3">{label}</figcaption>
    </figure>
  );
}
