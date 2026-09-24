"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Notch } from "@/components/notch/Notch";
import { addToShelf, DraggableFile, type FileKind, Shelf, type ShelfFile, useShelfDrop } from "@/components/surfaces/Shelf";
import { NOTCH, outerWidth } from "@/lib/notch";
import { Stage, StageBar } from "./Stage";

/** Already on the shelf when the page loads. */
const SHELVED: ShelfFile[] = [
  { id: "s1", name: "Screenshot 2026-09-18 at 16.01.12.png", kind: "screenshot" },
  { id: "s2", name: "Q3 invoice 0932.pdf", kind: "pdf" },
];

/** Lying on the desk under the drawing, waiting to be picked up. */
const DESK: { name: string; kind: FileKind }[] = [
  { name: "IMG_4130.HEIC", kind: "image" },
  { name: "Lease agreement.pdf", kind: "pdf" },
  { name: "Exports", kind: "folder" },
  { name: "build-1.4.2.zip", kind: "zip" },
];

/**
 * The drawn rect plus the air the app still counts as the notch:
 * NotchDisplayController.geometryRejects() insets the drawn rect by −6 once
 * something is on screen. The 24pt of padding this used to carry was a web
 * guess, and it reached a third of the way across the wallpaper.
 */
const SLOP = 6;

const plural = (n: number) => `${n} ${n === 1 ? "file" : "files"}`;

/**
 * The shelf, open, with four files on the plane below it. Drag one onto the
 * notch and it lands at the front of the strip; take it off the shelf with its
 * x and it is back on the desk. The desk is derived from the shelf, so the two
 * can never disagree.
 *
 * Tapping a file, or pressing it from the keyboard, puts it on the shelf too —
 * and focus travels with the file, from the desk tile to the tile's own x and
 * back again, so the round trip is completable without a pointer. Both buttons
 * unmount on the way, so the move has to be made after the list re-renders.
 */
export function ShelfDemo() {
  const [items, setItems] = useState<ShelfFile[]>(SHELVED);
  const [said, setSaid] = useState("");
  const root = useRef<HTMLDivElement | null>(null);
  /** The button focus should land on once the list has re-rendered without its counterpart. */
  const follow = useRef<string | null>(null);

  const focusInside = () => !!root.current?.contains(document.activeElement);

  const land = (f: { name: string; kind: FileKind }) => {
    if (focusInside()) follow.current = `Take ${f.name} off the shelf`;
    const next = addToShelf(items, f);
    setItems(next);
    setSaid(`${f.name} on the shelf, ${plural(next.length)}`);
  };

  const changeItems = (next: ShelfFile[]) => {
    const gone = items.find((i) => !next.some((n) => n.id === i.id));
    if (gone) {
      if (focusInside()) follow.current = `Put ${gone.name} on the shelf`;
      setSaid(`${gone.name} off the shelf, ${plural(next.length)}`);
    }
    setItems(next);
  };

  const drop = useShelfDrop(land);

  useLayoutEffect(() => {
    const label = follow.current;
    follow.current = null;
    if (!label || !root.current) return;
    const el = [...root.current.querySelectorAll<HTMLElement>("[aria-label]")].find(
      (e) => e.getAttribute("aria-label") === label,
    );
    // The counterpart may not exist yet: the desk list takes the focus rather
    // than the page losing it to <body>.
    (el ?? root.current.querySelector<HTMLElement>("[data-desk]"))?.focus();
  }, [items]);

  const desk = DESK.filter((f) => !items.some((i) => i.name === f.name));
  const box = NOTCH.expanded;

  return (
    <div ref={root}>
      <Stage size={{ width: 1000, height: 206 }} tablet={{ width: 600, height: 206 }} phone={{ width: 440, height: 186 }} maxScale={1.3}>
        {(w) => (
          <>
            <StageBar width={w} menus={["File", "Edit", "View", "Go"]} showClock={w >= 800} />
            {/* the drop target is the drawn notch and the 6pt round it, as in the app */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2"
              style={{ width: outerWidth(box) + SLOP * 2, height: box.height + SLOP }}
              {...drop.props}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ width: 440 }}>
                <Notch state="expanded" contentKey="shelf">
                  <Shelf items={items} onItemsChange={changeItems} receiving={drop.receiving} />
                </Notch>
              </div>
            </div>
          </>
        )}
      </Stage>
      {/* also where a tile carried back off the shelf lands: the desk is derived
          from the shelf, so taking one out puts it back here on its own. */}
      <ul
        aria-label="Files on the desk"
        data-desk
        data-shelf-out=""
        tabIndex={-1}
        className="mt-5 flex min-h-[54px] flex-wrap gap-2.5 outline-none sm:mt-6 sm:gap-3"
      >
        {desk.map((f) => (
          <li key={f.name}>
            <DraggableFile name={f.name} kind={f.kind} />
          </li>
        ))}
        {desk.length === 0 ? (
          <li className="self-center text-[13px] text-ink-3">All four are on the shelf. Take one off with its x and it comes back.</li>
        ) : null}
      </ul>
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </div>
  );
}
