"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ExpandedShell } from "./ExpandedShell";

/**
 * The drop shelf — ShelfView.swift, inside the expanded shell.
 *
 * Numbers are SurfaceMetrics at the 360 × 162 panel: content height 130, so
 * scale 1, detail `.rich`, side padding 360 × 0.055 = 19.8, and the tile side
 * 130 × 0.52 = 67.6. Label frames are side + 10 wide, which is why tiles sit
 * 77.6 apart plus the 9pt gap and the fourth one is cut by the scroll edge.
 */

export type FileKind = "image" | "screenshot" | "pdf" | "folder" | "zip" | "text";

export interface ShelfFile {
  /** stable identity; the page owns it */
  id: string;
  /** file name as Finder shows it, extension included */
  name: string;
  kind: FileKind;
}

const CONTENT_H = 162 - 32;
const TILE = Math.min(96, Math.max(40, CONTENT_H * 0.52)); // 67.6
const CORNER = TILE * 0.09;
const SIDE_PAD = 360 * 0.055;
const ACCENT = "var(--color-accent)";

/** ShelfStore.limit: a shelf is a staging area, not storage. */
export const SHELF_LIMIT = 24;

/**
 * ShelfStore.add for one file: newest first, and the same file dropped twice
 * moves to the front rather than appearing twice. Identity is the name here,
 * standing in for the file URL.
 */
export function addToShelf(items: ShelfFile[], file: Omit<ShelfFile, "id"> & { id?: string }): ShelfFile[] {
  const existing = items.find((i) => i.name === file.name);
  const next: ShelfFile = existing ?? { id: file.id ?? newId(), name: file.name, kind: file.kind };
  return [next, ...items.filter((i) => i !== existing)].slice(0, SHELF_LIMIT);
}

let counter = 0;
const newId = () => `shelf-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/* ─────────────────────────────── surface ─────────────────────────────── */

export function Shelf({
  items,
  onItemsChange,
  receiving = false,
  defaultSelecting = false,
  defaultSelection = [],
}: {
  /** files on the shelf, newest first */
  items: ShelfFile[];
  /** called with the new list when a tile is removed or a selection deleted; omit for a read-only shelf */
  onItemsChange?: (items: ShelfFile[]) => void;
  /** a file is being dragged over the notch: dashed accent outline, and the empty state changes */
  receiving?: boolean;
  /** start in the multi-select mode (bench and stills) */
  defaultSelecting?: boolean;
  /** ids ticked when starting in select mode */
  defaultSelection?: string[];
}) {
  const [selecting, setSelecting] = useState(defaultSelecting);
  const [selection, setSelection] = useState<Set<string>>(() => new Set(defaultSelection));
  const reduce = useReducedMotion();
  const interactive = !!onItemsChange && !receiving;

  // A drop ends any selection, as in AppDelegate.onDropFiles; so does the shelf emptying.
  const count = items.length;
  const prevCount = useRef(count);
  useEffect(() => {
    if (count > prevCount.current || count === 0) {
      setSelecting(false);
      setSelection(new Set());
    } else {
      setSelection((s) => {
        const live = new Set([...s].filter((id) => items.some((i) => i.id === id)));
        return live.size === s.size ? s : live;
      });
    }
    prevCount.current = count;
  }, [count, items]);

  const allSelected = count > 0 && selection.size === count;

  const toggle = (id: string) =>
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const endSelecting = () => {
    setSelecting(false);
    setSelection(new Set());
  };

  const remove = (id: string) => onItemsChange?.(items.filter((i) => i.id !== id));

  const deleteSelected = () => {
    if (selection.size === 0) return;
    onItemsChange?.(items.filter((i) => !selection.has(i.id)));
    endSelecting();
  };

  return (
    <ExpandedShell active="shelf">
      <div className="relative flex h-full w-full flex-col" style={{ paddingInline: SIDE_PAD, paddingBottom: 8 }}>
        {/* The drop outline: behind everything, 6pt in from the sides and 4 from the bottom. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 transition-opacity duration-150 ease-out"
          style={{ left: 6, right: 6, bottom: 4, opacity: receiving ? 0.9 : 0 }}
        >
          <DashedOutline />
        </span>

        {count === 0 ? (
          <Empty receiving={receiving} />
        ) : (
          <>
            <div className="flex h-[20px] shrink-0 items-center gap-[8px]" style={{ marginBottom: 5 }}>
              {selecting ? (
                <>
                  <p className="text-[10px] font-medium text-white/60" aria-live="polite">
                    {selection.size === 0 ? "Select files" : `${selection.size} selected`}
                  </p>
                  <span className="flex-1" />
                  <TextButton onClick={() => setSelection(allSelected ? new Set() : new Set(items.map((i) => i.id)))}>
                    {allSelected ? "None" : "All"}
                  </TextButton>
                  <TextButton onClick={endSelecting}>Cancel</TextButton>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    disabled={selection.size === 0}
                    className={clsx(
                      "flex items-center gap-[4px] rounded-full px-[8px] py-[3px] text-[10px] leading-[12px] font-semibold transition-colors",
                      selection.size === 0 ? "bg-white/12 text-white/30" : "bg-bad/85 text-white",
                    )}
                  >
                    <TrashFill />
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <p className="tnum text-[10px] font-medium text-white/50">
                    {count} {count === 1 ? "file" : "files"}
                  </p>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => interactive && setSelecting(true)}
                    aria-label="Choose files to remove"
                    title="Choose files to remove"
                    className="relative grid h-[20px] w-[26px] place-items-center text-white/45 hover:text-white/70 [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-y-[4px] [@media(pointer:coarse)]:before:-inset-x-[1px]"
                  >
                    <CheckmarkCircle />
                  </button>
                </>
              )}
            </div>

            <div
              className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role={selecting ? "group" : "list"}
              aria-label="Files on the shelf"
            >
              <div className="relative flex h-full w-max items-center gap-[9px] px-[2px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((item) => (
                    <Tile
                      key={item.id}
                      item={item}
                      reduce={!!reduce}
                      selecting={selecting}
                      selected={selection.has(item.id)}
                      interactive={interactive}
                      onToggle={() => toggle(item.id)}
                      onRemove={() => remove(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </div>
    </ExpandedShell>
  );
}

/**
 * What the notch shows while a file is dragged over it: the shelf surface in its
 * receiving state. With nothing on the shelf yet it is the filled tray and
 * "Drop to keep them here"; with files it is the strip inside a dashed outline.
 */
export function ShelfDropTarget({ items = [] }: { items?: ShelfFile[] }) {
  return <Shelf items={items} receiving />;
}

function Empty({ receiving }: { receiving: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[5px] text-center">
      <span className={receiving ? "text-accent" : "text-white/35"}>
        {receiving ? <TrayDownFill /> : <Tray />}
      </span>
      <p className={clsx("text-[11px] leading-[13px]", receiving ? "font-semibold text-white" : "text-white/45")}>
        {receiving ? "Drop to keep them here" : "Drag files onto the notch"}
      </p>
      {!receiving && (
        <p className="text-[9px] leading-[11px] text-white/30">Then drag them out wherever you need them</p>
      )}
    </div>
  );
}

function TextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-white/12 px-[7px] py-[3px] text-[10px] leading-[12px] font-medium text-white/65 hover:text-white/85"
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────── tile ─────────────────────────────── */

function Tile({
  ref,
  item,
  reduce,
  selecting,
  selected,
  interactive,
  onToggle,
  onRemove,
}: {
  /** AnimatePresence's popLayout measures the leaving tile through this */
  ref?: Ref<HTMLDivElement>;
  item: ShelfFile;
  reduce: boolean;
  selecting: boolean;
  selected: boolean;
  interactive: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const art = useRef<HTMLSpanElement>(null);
  const carry = useCarryOut({
    item,
    from: art,
    reduce,
    enabled: interactive && !selecting,
    onLanded: onRemove,
  });
  const showX = interactive && !selecting && (hovering || focused) && !carry.lifting;

  const artwork = (
    <span ref={art} className="relative block" style={{ width: TILE, height: TILE }}>
      <span className="absolute inset-0 overflow-hidden" style={{ borderRadius: CORNER }}>
        <FileThumb kind={item.kind} seed={item.name} />
      </span>
      {selecting && selected && (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{ borderRadius: CORNER, boxShadow: `inset 0 0 0 2.5px ${ACCENT}` }}
        />
      )}
      {selecting && (
        <span aria-hidden="true" className="absolute top-[4px] right-[4px]">
          {selected ? <CheckFill /> : <EmptyCircle />}
        </span>
      )}
    </span>
  );

  const label = (
    <MiddleTruncate
      name={item.name}
      className={clsx("mt-[3px] text-[9px] leading-[11px] transition-colors", hovering ? "text-white/80" : "text-white/50")}
    />
  );

  return (
    <motion.div
      ref={ref}
      layout={reduce ? false : "position"}
      role={selecting ? undefined : "listitem"}
      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
      // The app hands over a reference and leaves the source visible.
      animate={{ opacity: carry.lifting ? 0.4 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: reduce ? 1 : 0.6, transition: { duration: reduce ? 0 : 0.14, ease: "easeIn" } }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="relative flex shrink-0 flex-col items-center"
      style={{ width: TILE + 10 }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setFocused(false)}
      title={item.name}
      {...carry.handlers}
    >
      {selecting ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={item.name}
          onClick={onToggle}
          className="flex w-full flex-col items-center"
        >
          {artwork}
          {label}
        </button>
      ) : (
        <>
          {artwork}
          {label}
          {interactive && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Take ${item.name} off the shelf`}
              title="Take this one off the shelf"
              className={clsx(
                // 14pt is the drawn glyph; the hit area is 27, which holds 24
                // CSS px even where the stage is scaled down to fit a phone.
                "absolute top-[3px] grid size-[14px] place-items-center transition-opacity duration-100",
                "before:absolute before:-inset-[6.5px]",
                showX ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              style={{ right: 5 + 3 }}
            >
              <XFill />
            </button>
          )}
        </>
      )}
      {carry.image}
    </motion.div>
  );
}

/* ────────────────────────── carrying one back out ──────────────────────────
   ShelfView's tiles are drag sources as well as the result of a drop: the empty
   state says so. The lifted thing is the app's own drag preview — a plain
   fitted image with the file's name under it, no tilt and no lag — and the slot
   it came from stays drawn, because a drag hands over a reference.

   Release over anything carrying `data-shelf-out` and the file leaves the
   shelf; release over nothing and it springs back to its slot. */

const OUT = "shelfout";

/** Wire an element up as somewhere a shelved file can be carried back to. */
export function useShelfPickup(onPickup: (file: ShelfDragDetail) => void) {
  const cb = useRef(onPickup);
  useEffect(() => {
    cb.current = onPickup;
  });
  const cleanup = useRef<(() => void) | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;
    const take = (e: Event) => cb.current((e as CustomEvent<ShelfDragDetail>).detail);
    el.addEventListener(OUT, take);
    cleanup.current = () => el.removeEventListener(OUT, take);
  }, []);
  return { ref, "data-shelf-out": "" } as const;
}

/** How far a release can be flung into the spring that carries it home. */
const clampV = (v: number) => Math.max(-1800, Math.min(1800, v));
/** The strip is a horizontal scroller, so on a finger the scroll wins first. */
const LONG_PRESS = 350;

function useCarryOut({
  item,
  from,
  reduce,
  enabled,
  onLanded,
}: {
  item: ShelfFile;
  from: React.RefObject<HTMLSpanElement | null>;
  reduce: boolean;
  enabled: boolean;
  onLanded: () => void;
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [home, setHome] = useState<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const press = useRef<{ x: number; y: number; id: number; t: number } | null>(null);
  const last = useRef<{ x: number; y: number; t: number } | null>(null);
  const lifted = useRef(false);
  const hold = useRef<number | undefined>(undefined);
  const over = useRef<Element | null>(null);
  const detail = { name: item.name, kind: item.kind };

  const end = useCallback(() => {
    window.clearTimeout(hold.current);
    press.current = null;
    lifted.current = false;
    over.current = null;
    setAt(null);
  }, []);

  useEffect(() => () => window.clearTimeout(hold.current), []);

  if (!enabled) {
    return { lifting: false, image: null, handlers: {} as Record<string, never> };
  }

  const lift = (x: number, y: number) => {
    lifted.current = true;
    setHome(null);
    setAt({ x, y });
  };

  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
      press.current = { x: e.clientX, y: e.clientY, id: e.pointerId, t: e.timeStamp };
      last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // a pointer the browser no longer tracks; moves still reach the tile
      }
      if (e.pointerType !== "mouse") {
        const { clientX, clientY } = e;
        hold.current = window.setTimeout(() => lift(clientX, clientY), LONG_PRESS);
      }
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const p = press.current;
      if (!p || p.id !== e.pointerId) return;
      const far = Math.hypot(e.clientX - p.x, e.clientY - p.y) >= 4;
      if (!lifted.current) {
        // A finger that moves before the long press is scrolling the strip.
        if (e.pointerType !== "mouse") {
          if (far) {
            window.clearTimeout(hold.current);
            press.current = null;
          }
          return;
        }
        if (!far) return;
        lift(e.clientX, e.clientY);
      }
      last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      setAt({ x: e.clientX, y: e.clientY });
      over.current = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-shelf-out]") ?? null;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!press.current || press.current.id !== e.pointerId) return;
      const landed = lifted.current ? over.current : null;
      const release = last.current;
      end();
      if (landed) {
        landed.dispatchEvent(new CustomEvent<ShelfDragDetail>(OUT, { detail, bubbles: true }));
        onLanded();
        return;
      }
      if (!release || reduce) return;
      const slot = from.current?.getBoundingClientRect();
      if (!slot) return;
      const dt = Math.max(1, e.timeStamp - release.t) / 1000;
      setHome({
        x: slot.x + slot.width / 2,
        y: slot.y + slot.height / 2,
        vx: clampV((e.clientX - release.x) / dt),
        vy: clampV((e.clientY - release.y) / dt),
      });
      setAt({ x: e.clientX, y: e.clientY });
    },
    onPointerCancel: end,
  };

  const going = home != null;
  const image =
    at == null
      ? null
      : createPortal(
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed z-50 flex flex-col items-center font-[family-name:var(--font-system)]"
            style={{ left: at.x, top: at.y, translateX: "-50%", translateY: "-60%" }}
            initial={false}
            animate={going ? { x: home.x - at.x, y: home.y - at.y, opacity: 0.9 } : { x: 0, y: 0, opacity: 1 }}
            transition={
              going
                ? {
                    type: "spring",
                    stiffness: 520,
                    damping: 42,
                    velocity: Math.hypot(home.vx, home.vy),
                  }
                : { duration: 0 }
            }
            onAnimationComplete={() => {
              if (going) {
                setHome(null);
                setAt(null);
              }
            }}
          >
            <span className="block size-[56px] opacity-85 drop-shadow-[0_6px_10px_rgb(0_0_0/0.45)]">
              <FileThumb kind={item.kind} seed={item.name} />
            </span>
            <span className="mt-1 max-w-[140px] truncate rounded-[4px] bg-[#2f63d9] px-1.5 py-px text-[11px] text-white">
              {item.name}
            </span>
          </motion.div>,
          document.body,
        );

  return { lifting: at != null && !going, image, handlers };
}

/**
 * `.truncationMode(.middle)`: the start shrinks with an ellipsis, the last few
 * characters — the tail of the name and its extension — always stay.
 */
function MiddleTruncate({ name, className }: { name: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(name);

  // One text run, measured, rather than two boxes with `text-overflow: ellipsis`
  // in the first: CSS draws that ellipsis as soon as a character does not fit,
  // which leaves up to a character's width of empty box before the tail and
  // reads as "Screens… .12.png". `.truncationMode(.middle)` has no such gap.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const room = el.clientWidth;
      const font = fontOf(el);
      if (!room || !font) return;
      setShown(middleTruncate(name, room, font));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [name]);

  return (
    <span ref={ref} className={clsx("block w-full truncate text-center whitespace-nowrap", className)} title={name}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

let ruler: CanvasRenderingContext2D | null = null;
function fontOf(el: HTMLElement) {
  const s = getComputedStyle(el);
  return `${s.fontWeight} ${s.fontSize} / ${s.lineHeight} ${s.fontFamily}`;
}
function middleTruncate(name: string, room: number, font: string) {
  ruler ??= document.createElement("canvas").getContext("2d");
  if (!ruler) return name;
  ruler.font = font;
  // A point of slack: the canvas and the layout round differently, and a run
  // that lands a fraction over would pick up a second ellipsis from `truncate`.
  room -= 1;
  if (ruler.measureText(name).width <= room) return name;
  const keep = Math.min(name.length - 1, 7);
  const tail = name.slice(name.length - keep);
  // The most head characters that still leave room for "…" and the tail.
  let lo = 0;
  let hi = name.length - keep;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ruler.measureText(`${name.slice(0, mid)}…${tail}`).width <= room) lo = mid;
    else hi = mid - 1;
  }
  return `${name.slice(0, lo)}…${tail}`;
}

/* ─────────────────────────────── glyphs ───────────────────────────────
   SF Symbols redrawn at the app's point sizes. Lucide has no filled circle
   variants with a punched-out mark, which is what every one of these is. */

function CheckmarkCircle() {
  // checkmark.circle, 11pt regular
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="5.3" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M3.7 6.2 5.3 7.8 8.4 4.4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XFill() {
  // xmark.circle.fill, palette white on black 0.7
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="6.6" fill="rgb(0 0 0 / 0.7)" />
      <path d="M4.8 4.8l4.4 4.4M9.2 4.8 4.8 9.2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckFill() {
  // checkmark.circle.fill, white on accent
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="6.6" fill={ACCENT} />
      <path d="M4.3 7.2 6.1 9 9.8 5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyCircle() {
  // circle, white 0.85 over black 0.45
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="6" fill="rgb(0 0 0 / 0.45)" stroke="rgb(255 255 255 / 0.85)" strokeWidth="1.2" />
    </svg>
  );
}

function TrashFill() {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden="true" fill="currentColor">
      <rect x="0.2" y="1.6" width="8.6" height="1.1" rx="0.5" />
      <path d="M3.1 0.4h2.8a.5.5 0 0 1 .5.5v.8H2.6V.9a.5.5 0 0 1 .5-.5Z" />
      <path d="M1.1 3.2h6.8l-.5 5.9a.9.9 0 0 1-.9.8H2.5a.9.9 0 0 1-.9-.8Z" />
    </svg>
  );
}

function Tray() {
  // tray, 20pt light
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
      <path d="M1.5 11.5 4.6 3.2A2 2 0 0 1 6.5 1.9h11a2 2 0 0 1 1.9 1.3l3.1 8.3v4.4a2.5 2.5 0 0 1-2.5 2.5H4a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M1.5 11.5h5.6a1 1 0 0 1 1 .9 3.9 3.9 0 0 0 7.8 0 1 1 0 0 1 1-.9h5.6" />
    </svg>
  );
}

function TrayDownFill() {
  // tray.and.arrow.down.fill
  return (
    <svg width="24" height="22" viewBox="0 0 24 22" aria-hidden="true" fill="currentColor">
      <path d="M12 0.6a.9.9 0 0 1 .9.9v6.8l2.2-2.2a.9.9 0 1 1 1.3 1.3l-3.8 3.7a.9.9 0 0 1-1.2 0L7.6 7.4a.9.9 0 1 1 1.3-1.3l2.2 2.2V1.5a.9.9 0 0 1 .9-.9Z" />
      <path d="M4.5 5.2h1.6l.4 1.5H5.3L2.9 13h4.2a1.1 1.1 0 0 1 1.1 1 3.8 3.8 0 0 0 7.6 0 1.1 1.1 0 0 1 1.1-1h4.2l-2.4-6.3h-1.2l.4-1.5h1.6a1.6 1.6 0 0 1 1.5 1l2.6 7v4.2a2.9 2.9 0 0 1-2.9 2.9H4.1a2.9 2.9 0 0 1-2.9-2.9v-4.2l2.6-7a1.6 1.6 0 0 1 1.5-1Z" />
    </svg>
  );
}

function DashedOutline() {
  // RoundedRectangle(10).strokeBorder(accent, lineWidth 2, dash [5, 4]) — drawn
  // with SVG because CSS dashes cannot be told how long to be.
  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <rect
        x="1"
        y="1"
        rx="9"
        style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
        fill="none"
        stroke={ACCENT}
        strokeWidth="2"
        strokeDasharray="5 4"
      />
    </svg>
  );
}

/* ─────────────────────────────── thumbnails ───────────────────────────────
   What FileThumbnails hands the tile: a QuickLook thumbnail where one exists
   (photos, screenshots, PDFs and text render their content, fitted into the
   square), and the Finder icon where it does not (folders, archives). */

/**
 * A file's thumbnail, drawn. `seed` (the file name, usually) picks between a
 * few versions of the same kind, so two photos on the shelf are two photos.
 */
export function FileThumb({ kind, seed = "", className }: { kind: FileKind; seed?: string; className?: string }) {
  const uid = useId().replace(/:/g, "");
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (
    <svg viewBox="0 0 100 100" className={clsx("block h-full w-full", className)} aria-hidden="true">
      {THUMBS[kind](uid, h % 3)}
    </svg>
  );
}

// Three light conditions for the photo: dusk, noon, blue hour.
const PHOTO = [
  { sky: ["#23324f", "#8a5a6a", "#f0a36a"], sun: "#ffd9a3", far: "#3a3346", near: "#26243a", sea: ["#c07a5e", "#2a2f45"], shore: "#1a1c2a" },
  { sky: ["#3f7fc4", "#86b5df", "#d8e7ef"], sun: "#fffbe8", far: "#6d8aa0", near: "#4a6a58", sea: ["#5d93b5", "#2d5877"], shore: "#c9b48a" },
  { sky: ["#0d1428", "#1f3159", "#46609a"], sun: "#e9eefc", far: "#1b2540", near: "#111a30", sea: ["#2d4574", "#0c1224"], shore: "#080c18" },
];

const THUMBS: Record<FileKind, (id: string, v: number) => ReactNode> = {
  // A landscape photo, 4:3, fitted: a dusk shoreline.
  image: (id, v) => {
    const p = PHOTO[v];
    return (
    <g>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.55" stopColor={p.sky[1]} />
          <stop offset="1" stopColor={p.sky[2]} />
        </linearGradient>
        <linearGradient id={`${id}sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sea[0]} />
          <stop offset="1" stopColor={p.sea[1]} />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <rect x="0" y="12.5" width="100" height="75" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect x="0" y="12.5" width="100" height="75" fill={`url(#${id}sky)`} />
        <circle cx="64" cy={v === 1 ? 26 : 58} r={v === 2 ? 4 : 7} fill={p.sun} />
        <path d="M0 55 L14 46 L24 51 L38 40 L52 52 L60 49 L72 56 L100 50 V64 H0Z" fill={p.far} />
        <path d="M0 60 L18 54 L34 58 L58 55 L100 59 V64 H0Z" fill={p.near} />
        <rect x="0" y="63" width="100" height="24.5" fill={`url(#${id}sea)`} />
        <path d="M58 66h12M55 70h18M60 74h9" stroke={p.sun} strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M0 80 Q30 76 60 80 T100 79 V87.5 H0Z" fill={p.shore} opacity="0.7" />
      </g>
    </g>
    );
  },

  // A screenshot of a window on the desk wallpaper, 16:10, fitted.
  screenshot: (id) => (
    <g>
      <defs>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d5978" />
          <stop offset="0.55" stopColor="#786154" />
          <stop offset="1" stopColor="#9e8c66" />
        </linearGradient>
      </defs>
      <rect x="0" y="18.75" width="100" height="62.5" fill={`url(#${id}d)`} />
      <rect x="0" y="18.75" width="100" height="2.4" fill="#1d1f24" opacity="0.55" />
      <path d="M41 18.75h18v2.4a2 2 0 0 1-2 2H43a2 2 0 0 1-2-2Z" fill="#000" />
      <g>
        <rect x="14" y="27" width="72" height="47" rx="2.2" fill="#1e1f23" />
        <rect x="14" y="27" width="72" height="6" rx="2.2" fill="#2b2c31" />
        <rect x="14" y="31" width="72" height="2" fill="#2b2c31" />
        <circle cx="17.5" cy="30" r="1" fill="#ff5f57" />
        <circle cx="20.8" cy="30" r="1" fill="#febc2e" />
        <circle cx="24.1" cy="30" r="1" fill="#28c840" />
        <rect x="14" y="33" width="15" height="41" fill="#26272c" />
        {[37, 41, 45, 49].map((y) => (
          <rect key={y} x="16.5" y={y} width={y === 41 ? 9 : 8} height="1.4" rx="0.7" fill="#fff" opacity={y === 41 ? 0.55 : 0.25} />
        ))}
        {[37, 41, 45, 49, 53, 57, 61, 65].map((y, i) => (
          <rect key={y} x="33" y={y} width={[40, 46, 28, 44, 36, 48, 22, 38][i]} height="1.4" rx="0.7" fill="#fff" opacity="0.32" />
        ))}
        <rect x="33" y="40.3" width="3" height="2.2" fill="#fc7338" opacity="0.8" />
      </g>
    </g>
  ),

  // First page of a PDF, US letter, fitted.
  pdf: () => (
    <g>
      <rect x="11.6" y="0.4" width="76.8" height="99.2" fill="#fbfbfa" stroke="#000" strokeOpacity="0.18" strokeWidth="0.6" />
      <rect x="19" y="9" width="30" height="3.4" rx="0.6" fill="#1b1b1d" />
      <rect x="19" y="15" width="20" height="1.6" rx="0.5" fill="#1b1b1d" opacity="0.45" />
      <rect x="62" y="9" width="19" height="1.4" rx="0.5" fill="#1b1b1d" opacity="0.4" />
      <rect x="66" y="12" width="15" height="1.4" rx="0.5" fill="#1b1b1d" opacity="0.4" />
      <rect x="19" y="22" width="62" height="0.5" fill="#1b1b1d" opacity="0.3" />
      {[27, 30.5, 34, 37.5, 41].map((y, i) => (
        <rect key={y} x="19" y={y} width={[62, 60, 62, 57, 38][i]} height="1.2" rx="0.4" fill="#1b1b1d" opacity="0.38" />
      ))}
      <rect x="19" y="47" width="62" height="22" fill="#eceae6" />
      <path d="M22 65 L32 58 L41 61 L52 52 L61 55 L70 49 L78 51" fill="none" stroke="#fc7338" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M22 65 L32 61 L41 63 L52 59 L61 60 L70 57 L78 58" fill="none" stroke="#3d5978" strokeWidth="1.1" strokeLinejoin="round" />
      {[74, 77.5, 81, 84.5, 88].map((y, i) => (
        <rect key={y} x="19" y={y} width={[62, 59, 62, 61, 30][i]} height="1.2" rx="0.4" fill="#1b1b1d" opacity="0.38" />
      ))}
      <rect x="47" y="94" width="6" height="1.1" rx="0.4" fill="#1b1b1d" opacity="0.3" />
    </g>
  ),

  // A plain-text file: QuickLook renders its first lines on a page.
  text: () => (
    <g>
      <rect x="11.6" y="0.4" width="76.8" height="99.2" fill="#fff" stroke="#000" strokeOpacity="0.18" strokeWidth="0.6" />
      {[
        [8, 34], [12, 52], [16, 46], [20, 60], [28, 22], [32, 55], [36, 48], [40, 58], [44, 30],
        [52, 40], [56, 61], [60, 44], [64, 52], [72, 27], [76, 57], [80, 49], [84, 36],
      ].map(([y, w]) => (
        <rect key={y} x="17" y={y} width={w} height="1.5" rx="0.3" fill="#111" opacity="0.62" />
      ))}
    </g>
  ),

  // The Finder folder icon.
  folder: (id) => (
    <g>
      <defs>
        <linearGradient id={`${id}fb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#62b7f3" />
          <stop offset="1" stopColor="#3a97e0" />
        </linearGradient>
        <linearGradient id={`${id}ff`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0fb" />
          <stop offset="1" stopColor="#6cbaf5" />
        </linearGradient>
      </defs>
      <path
        d="M8 22a4 4 0 0 1 4-4h22.5a4 4 0 0 1 3 1.4l3.3 3.8a4 4 0 0 0 3 1.4H88a4 4 0 0 1 4 4V80a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z"
        fill={`url(#${id}fb)`}
      />
      <rect x="11" y="28.5" width="78" height="10" rx="2" fill="#fff" opacity="0.9" />
      <path d="M8 36a4 4 0 0 1 4-4h76a4 4 0 0 1 4 4v44a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" fill={`url(#${id}ff)`} />
      <path d="M12 32.6h76" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.8" />
      <path d="M8 80a4 4 0 0 0 4 4h76a4 4 0 0 0 4-4" fill="none" stroke="#2f86cc" strokeOpacity="0.5" strokeWidth="0.8" />
    </g>
  ),

  // The Archive Utility document: a page with a zip down the middle.
  zip: (id) => (
    <g>
      <defs>
        <linearGradient id={`${id}z`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eeeeef" />
        </linearGradient>
      </defs>
      <path d="M20 8a3 3 0 0 1 3-3h38l19 19v68a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3Z" fill={`url(#${id}z)`} stroke="#000" strokeOpacity="0.16" strokeWidth="0.7" />
      <path d="M61 5v16a3 3 0 0 0 3 3h16" fill="#e2e2e4" stroke="#000" strokeOpacity="0.16" strokeWidth="0.7" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={i % 2 ? 50 : 44} y={8 + i * 4.2} width="6" height="2.6" rx="0.5" fill="#8e8e93" />
      ))}
      <rect x="44.5" y="46" width="11" height="15" rx="2.2" fill="#8e8e93" />
      <rect x="47.3" y="50" width="5.4" height="7" rx="1.2" fill="#f4f4f5" />
      <text x="50" y="84" textAnchor="middle" fontSize="11" fontWeight="700" fill="#8e8e93" style={{ fontFamily: "var(--font-system)", letterSpacing: 0.4 }}>
        ZIP
      </text>
    </g>
  ),
};

/* ─────────────────────────────── dragging on ───────────────────────────────
   Pointer events rather than HTML drag-and-drop: they work with touch, they
   can draw their own drag image, and they cross the scaled stage without any
   coordinate maths. The drop target is found under the pointer by the
   `data-shelf-drop` attribute and told what is happening with DOM events. */

export interface ShelfDragDetail {
  name: string;
  kind: FileKind;
}

const ENTER = "shelfdragenter";
const LEAVE = "shelfdragleave";
const DROP = "shelfdrop";

const fire = (el: Element | null, type: string, detail: ShelfDragDetail) =>
  el?.dispatchEvent(new CustomEvent<ShelfDragDetail>(type, { detail }));

const targetAt = (x: number, y: number) =>
  document.elementFromPoint(x, y)?.closest("[data-shelf-drop]") ?? null;

/**
 * Wire an element up as a drop target. Spread `props` onto it; `receiving` is
 * true while a DraggableFile is held over it, and `onDrop` runs when one lands.
 */
export function useShelfDrop(onDrop: (file: ShelfDragDetail) => void) {
  const [receiving, setReceiving] = useState(false);
  const cb = useRef(onDrop);
  useEffect(() => {
    cb.current = onDrop;
  });
  const cleanup = useRef<(() => void) | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;
    const enter = () => setReceiving(true);
    const leave = () => setReceiving(false);
    const drop = (e: Event) => {
      setReceiving(false);
      cb.current((e as CustomEvent<ShelfDragDetail>).detail);
    };
    el.addEventListener(ENTER, enter);
    el.addEventListener(LEAVE, leave);
    el.addEventListener(DROP, drop);
    cleanup.current = () => {
      el.removeEventListener(ENTER, enter);
      el.removeEventListener(LEAVE, leave);
      el.removeEventListener(DROP, drop);
    };
  }, []);
  return { receiving, props: { ref, "data-shelf-drop": "" } };
}

/**
 * A file on the page that the visitor can pick up and drop onto the notch.
 * Dragging draws a Finder-style drag image under the pointer; pressing it with
 * the keyboard (or tapping without moving) puts it on the first shelf on the page.
 */
export function DraggableFile({
  name,
  kind,
  className,
  onDropped,
}: {
  /** file name, extension included */
  name: string;
  kind: FileKind;
  className?: string;
  /** called after the file lands on a drop target */
  onDropped?: (file: ShelfDragDetail) => void;
}) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const over = useRef<Element | null>(null);
  const moved = useRef(false);
  const detail = { name, kind };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // a pointer the browser no longer tracks; moves still reach the button
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    if (!moved.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 4) return;
    moved.current = true;
    setDrag({ x: e.clientX, y: e.clientY });
    const t = targetAt(e.clientX, e.clientY);
    if (t !== over.current) {
      fire(over.current, LEAVE, detail);
      fire(t, ENTER, detail);
      over.current = t;
    }
  };

  const finish = (e: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    start.current = null;
    setDrag(null);
    const t = over.current;
    over.current = null;
    if (!t) return;
    if (cancelled) fire(t, LEAVE, detail);
    else {
      fire(t, DROP, detail);
      onDropped?.(detail);
    }
  };

  const onClick = () => {
    // A press that never became a drag: keyboard, or a tap.
    if (moved.current) {
      moved.current = false;
      return;
    }
    const t = document.querySelector("[data-shelf-drop]");
    if (t) {
      fire(t, DROP, detail);
      onDropped?.(detail);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Put ${name} on the shelf`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onClick={onClick}
        className={clsx(
          // `touch-none` only for a mouse. The notch is ABOVE these cards, so
          // the drag onto it is a vertical gesture; handing that axis to the
          // scroller would fire pointercancel mid-drag. On a finger there is no
          // drag anyway — a tap puts the file on the shelf — so the default lets
          // the page scroll from a thumb that lands here.
          "group flex w-[152px] items-center gap-3 rounded-[10px] border border-hair bg-plane-mid py-2 pr-3 pl-2 text-left select-none [@media(pointer:fine)]:touch-none",
          "cursor-grab transition-colors hover:border-leader active:cursor-grabbing",
          drag && "opacity-40",
          className,
        )}
      >
        <span className="size-9 shrink-0">
          <FileThumb kind={kind} seed={name} />
        </span>
        <span className="min-w-0 truncate font-[family-name:var(--font-system)] text-[12px] text-ink-2 group-hover:text-ink">
          {name}
        </span>
      </button>
      {drag &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-50 flex flex-col items-center font-[family-name:var(--font-system)]"
            style={{ left: drag.x, top: drag.y, transform: "translate(-50%, -60%)" }}
          >
            <span className="block size-[56px] opacity-85 drop-shadow-[0_6px_10px_rgb(0_0_0/0.45)]">
              <FileThumb kind={kind} seed={name} />
            </span>
            <span className="mt-1 max-w-[140px] truncate rounded-[4px] bg-[#2f63d9] px-1.5 py-px text-[11px] text-white">
              {name}
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
