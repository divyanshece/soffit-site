"use client";

import clsx from "clsx";
import {
  AlignLeft,
  Check,
  ClipboardList,
  Copy,
  File,
  Image as ImageIcon,
  Link2,
  Pin,
  PinOff,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NOTCH } from "@/lib/notch";
import { ExpandedShell } from "./ExpandedShell";

/**
 * The clipboard surface — ClipboardView.swift, redrawn.
 *
 * A list you search, arrow through and press Return on. Point sizes are the
 * Swift source's at SurfaceMetrics scale 1: a 28pt search capsule, 34pt rows
 * with a 26pt glyph well, 12pt text over a 9pt source line, 2pt between rows.
 * The selected row sits in the accent at 26%; a hovered one in white at 10%,
 * and only a hovered row shows its copy / pin / remove buttons — the text
 * truncates to make room for them, as it does in the app.
 *
 * Store rules from Clipboard.swift: pinned first, then most recent; search is a
 * case- and diacritic-insensitive substring match; clear keeps pinned items;
 * the selection is always a visible row.
 */

export type ClipboardKind = "text" | "image" | "files";

export interface ClipboardEntry {
  id: string;
  /** What was copied. The row shows its first non-empty line. */
  text: string;
  /** Display name of the app it came from. Omitted when the pasteboard didn't say. */
  source?: string;
  /** Payload type; picks the glyph. Text starting with "http" gets the link glyph. */
  kind?: ClipboardKind;
  pinned?: boolean;
}

export const CLIPBOARD_SEED: ClipboardEntry[] = [
  { id: "c1", text: "swift test --parallel", source: "Visual Studio Code" },
  { id: "c2", text: "The finished underside of an overhang.", source: "Visual Studio Code" },
  { id: "c3", text: "ditto -c -k --keepParent build/Soffit.app Soffit.zip", source: "Terminal" },
  { id: "c4", text: "https://developer.apple.com/documentation/appkit/nspanel", source: "Safari" },
  { id: "c5", text: "defaults read com.apple.dock autohide", source: "Terminal" },
  { id: "c6", text: "Meet at 4, not 3. The room moved.", source: "Messages" },
];

// SurfaceMetrics.sidePadding: 5.5% of the panel width, clamped to 10...40.
const SIDE = Math.min(40, Math.max(10, NOTCH.expanded.width * 0.055));
const ROW_GAP = 2;

interface Held extends ClipboardEntry {
  /** recency: 0 is the newest. Pinning re-sorts on this, so nothing shuffles. */
  rank: number;
}

const sortHeld = (a: Held, b: Held) =>
  a.pinned === b.pinned ? a.rank - b.rank : a.pinned ? -1 : 1;

const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function searchText(e: ClipboardEntry) {
  if (e.kind === "image") return "image picture screenshot";
  return e.text;
}

function preview(e: ClipboardEntry) {
  const trimmed = e.text.trim();
  const line = trimmed.split(/\r?\n/)[0] ?? trimmed;
  return line.length ? line : `${e.text.length} characters of whitespace`;
}

export function Clipboard({
  items = CLIPBOARD_SEED,
  initialQuery = "",
  autoFocus = false,
  onPaste,
  onEscape,
}: {
  /** The history, newest first. Read once on mount; the surface owns it from then on. */
  items?: ClipboardEntry[];
  /** Text already in the search field when the surface mounts. */
  initialQuery?: string;
  /** Take keyboard focus on mount, as the app's field does when the surface opens. */
  autoFocus?: boolean;
  /** A row was clicked or Return pressed. The text is also written to the real clipboard. */
  onPaste?: (entry: ClipboardEntry) => void;
  /** Escape was pressed; the app collapses the notch here. */
  onEscape?: () => void;
}) {
  const reduce = useReducedMotion();
  const listId = useId();
  const hintId = useId();
  const emptyId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Row positions from the last render, and whether the next re-order should glide.
  const tops = useRef(new Map<string, number>());
  const glide = useRef(false);

  const [store, setStore] = useState<Held[]>(() =>
    items.map((e, rank) => ({ ...e, rank })).sort(sortHeld),
  );
  const [query, setQuery] = useState(initialQuery);
  const [selection, setSelection] = useState<string | null>(null);
  // Which edges of the list have more beyond them. The app clips the row hard at
  // the panel's lip; the fade only says which way the rest of it is.
  const [edges, setEdges] = useState({ top: false, bottom: false });
  /** What the last keyboard action did, for the one polite region under the field. */
  const [said, setSaid] = useState("");

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return q ? store.filter((e) => fold(searchText(e)).includes(q)) : store;
  }, [store, query]);

  // normaliseSelection(): keep it if it is still visible, else the first row.
  const selected = visible.some((e) => e.id === selection) ? selection : (visible[0]?.id ?? null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // No rAF and no observer: the scroller tells us when it moves, and the list
  // length tells us when it changed under us.
  const readEdges = useCallback(() => {
    const box = scrollRef.current;
    if (!box) return;
    const top = box.scrollTop > 1;
    const bottom = box.scrollTop + box.clientHeight < box.scrollHeight - 1;
    setEdges((e) => (e.top === top && e.bottom === bottom ? e : { top, bottom }));
  }, []);
  useLayoutEffect(readEdges, [readEdges, visible.length]);

  useEffect(() => {
    if (!said) return;
    const t = window.setTimeout(() => setSaid(""), 1200);
    return () => window.clearTimeout(t);
  }, [said]);

  // Keep the selection in view, centred, the way ScrollViewReader does.
  // Scrolls only the list, never the page.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || !selected) return;
    const row = box.querySelector<HTMLElement>(`[data-row="${CSS.escape(selected)}"]`);
    if (!row) return;
    const top = row.offsetTop - (box.clientHeight - row.offsetHeight) / 2;
    const max = box.scrollHeight - box.clientHeight;
    const target = Math.max(0, Math.min(max, top));
    if (Math.abs(box.scrollTop - target) < 1) return;
    box.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
  }, [selected, reduce]);

  // Pinning moves a row to the top. A hand-rolled FLIP rather than motion's
  // `layout`: offsetTop is in the surface's own points, so it stays right when
  // the whole Mac stage is scaled to fit the page, where measured boxes would not.
  useLayoutEffect(() => {
    const list = listRef.current;
    const next = new Map<string, number>();
    list?.querySelectorAll<HTMLElement>(":scope > li[data-id]").forEach((li) => {
      const id = li.dataset.id!;
      next.set(id, li.offsetTop);
      const was = tops.current.get(id);
      if (glide.current && !reduce && was !== undefined && was !== li.offsetTop) {
        animate(li, { y: [was - li.offsetTop, 0] }, { type: "spring", stiffness: 520, damping: 42 });
      }
    });
    tops.current = next;
    glide.current = false;
  });

  const paste = (e: ClipboardEntry) => {
    setSelection(e.id);
    writeClipboard(e.text);
    onPaste?.(e);
  };
  const remove = (id: string) => setStore((s) => s.filter((e) => e.id !== id));
  const togglePin = (id: string) => {
    glide.current = true;
    setStore((s) => s.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e)).sort(sortHeld));
  };
  const clear = () => setStore((s) => s.filter((e) => e.pinned));

  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key === "Escape") {
      onEscape?.();
      return;
    }
    if (!visible.length) return;
    const indexOf = (id: string | null) => Math.max(0, visible.findIndex((e) => e.id === id));
    const step = (by: number) =>
      setSelection((prev) => {
        const from = visible.some((e) => e.id === prev) ? prev : visible[0].id;
        return visible[Math.min(visible.length - 1, Math.max(0, indexOf(from) + by))].id;
      });
    const i = indexOf(selected);
    // Buttons inside a row keep their own Return.
    const onButton = (ev.target as HTMLElement).closest("button") !== null;
    const cmd = ev.metaKey || ev.ctrlKey;
    switch (ev.key) {
      case "ArrowDown":
        ev.preventDefault();
        step(1);
        break;
      case "ArrowUp":
        ev.preventDefault();
        step(-1);
        break;
      case "Enter":
        if (onButton) return;
        ev.preventDefault();
        paste(visible[i]);
        break;
      case "Backspace":
      case "Delete":
        if (!cmd) return;
        ev.preventDefault();
        setSaid("Removed");
        remove(visible[i].id);
        break;
      // The three row actions only ever appear under the pointer, as they do in
      // the app. These are the keyboard's way to the same three things.
      case "c":
      case "C": {
        // A real selection in the field still gets the browser's own copy.
        const field = inputRef.current;
        if (!cmd || (field && field.selectionStart !== field.selectionEnd)) return;
        ev.preventDefault();
        writeClipboard(visible[i].text);
        setSaid("Copied");
        break;
      }
      case "p":
      case "P":
        if (!cmd) return;
        ev.preventDefault();
        setSaid(visible[i].pinned ? "Unpinned" : "Kept");
        togglePin(visible[i].id);
        break;
    }
  };

  return (
    <ExpandedShell active="clipboard">
      <div className="flex h-full flex-col pb-[8px]" onKeyDown={onKeyDown}>
        {/* The search capsule: glyph, field, count, clear. */}
        <div style={{ paddingInline: SIDE }} className="pb-[6px]">
          {/* The field's own outline is off; the ring goes round the whole capsule instead. */}
          <div className="flex items-center gap-[7px] rounded-full bg-white/14 px-[9px] py-[5px] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-1 has-[input:focus-visible]:outline-lip has-[input:focus-visible]:outline-solid">
            <Search aria-hidden="true" size={11} strokeWidth={2.2} className="shrink-0 text-white/45" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="Search clipboard history"
              aria-controls={listId}
              aria-expanded="true"
              aria-autocomplete="list"
              aria-describedby={hintId}
              aria-activedescendant={selected ? `${listId}-${selected}` : undefined}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Search what you copied"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-[18px] min-w-0 flex-1 bg-transparent p-0 text-[12px] leading-[18px] text-white caret-[rgb(10_132_255)] outline-none placeholder:text-white/55 focus-visible:outline-none"
            />
            <span className="tnum shrink-0 text-[9.5px] text-white/55">
              <span className="sr-only">Items: </span>
              {visible.length}
            </span>
            <button
              type="button"
              onClick={clear}
              title="Clear everything except pinned items"
              aria-label="Clear everything except pinned items"
              className="relative -m-[3px] grid shrink-0 place-items-center rounded-[4px] p-[3px] text-white/45 hover:text-white/70 [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-[8px]"
            >
              <Trash2 size={11} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* One polite region under the field: the empty state, or what a key just did. */}
        <span id={emptyId} className="sr-only" aria-live="polite">
          {visible.length === 0 ? (query.trim() ? "No matches" : "Nothing copied yet") : said}
        </span>
        <span id={hintId} className="sr-only">
          Up and down arrows move through the list, Return pastes. With Command or Control: C copies
          without pasting, P keeps this one, Delete removes it.
        </span>

        {visible.length === 0 ? <Empty searching={query.trim().length > 0} /> : null}
        <div
          ref={scrollRef}
          tabIndex={-1}
          onScroll={readEdges}
          className={clsx(
            "relative min-h-0 overflow-y-auto outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            visible.length === 0 ? "h-0" : "flex-1",
          )}
          style={edgeMask(edges)}
        >
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Clipboard history"
              style={{ paddingInline: SIDE }}
              className="relative"
            >
              <AnimatePresence initial={false}>
                {visible.map((e) => (
                  <motion.li
                    key={e.id}
                    data-id={e.id}
                    id={`${listId}-${e.id}`}
                    role="option"
                    aria-selected={e.id === selected}
                    initial={false}
                    exit={
                      reduce
                        ? { opacity: 0, transition: { duration: 0 } }
                        : {
                            height: 0,
                            opacity: 0,
                            transition: {
                              height: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
                              opacity: { duration: 0.1 },
                            },
                          }
                    }
                    style={{ paddingBottom: ROW_GAP, overflow: "hidden" }}
                  >
                    <Row
                      entry={e}
                      selected={e.id === selected}
                      onPaste={() => paste(e)}
                      onPin={() => togglePin(e.id)}
                      onRemove={() => remove(e.id)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
        </div>
      </div>
    </ExpandedShell>
  );
}

/**
 * The scroller's edges. The app clips its last row hard at the panel's lip, so
 * the clip stays; this only says which way the rest of the list is, and goes
 * away entirely once there is nothing beyond that edge.
 */
const FADE = 11;
function edgeMask({ top, bottom }: { top: boolean; bottom: boolean }): React.CSSProperties {
  if (!top && !bottom) return {};
  const stops = [
    top ? `transparent 0, black ${FADE}px` : "black 0",
    bottom ? `black calc(100% - ${FADE}px), transparent 100%` : "black 100%",
  ].join(", ");
  const mask = `linear-gradient(to bottom, ${stops})`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

function Row({
  entry,
  selected,
  onPaste,
  onPin,
  onRemove,
}: {
  entry: ClipboardEntry;
  selected: boolean;
  onPaste: () => void;
  onPin: () => void;
  onRemove: () => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 900);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div
      data-row={entry.id}
      data-selected={selected}
      title="Paste into what you were doing"
      onClick={onPaste}
      className={clsx(
        "group flex h-[34px] cursor-default items-center gap-[8px] rounded-[6px] px-[7px] py-[4px]",
        selected ? "bg-accent/26" : "hover:bg-white/10 focus-within:bg-white/10",
      )}
    >
      <Thumb entry={entry} />
      <div className="min-w-0 flex-1 leading-none">
        <p className="truncate text-[12px] leading-[15px] text-white">{preview(entry)}</p>
        {entry.source ? (
          <p className="truncate text-[9px] leading-[11px] text-white/55">{entry.source}</p>
        ) : null}
      </div>

      {entry.pinned ? (
        <Pin aria-label="Pinned" size={9} strokeWidth={2} fill="currentColor" className="ml-[-4px] shrink-0 text-accent" />
      ) : null}

      {/* Hover actions. On touch screens, where nothing hovers, the selected row shows them. */}
      <div
        className={clsx(
          // Coarse pointers get a wider pitch so the enlarged hit areas below
          // cannot overlap; the drawn glyphs and the mouse layout are untouched.
          "hidden shrink-0 items-center gap-[8px] group-hover:flex group-focus-within:flex [@media(pointer:coarse)]:gap-[17px]",
          selected && "pointer-coarse:flex",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Action
          label={copied ? "Copied" : "Copy without pasting"}
          onClick={() => {
            writeClipboard(entry.text);
            setCopied(true);
          }}
        >
          {copied ? <Check size={10} strokeWidth={2} /> : <Copy size={10} strokeWidth={1.8} />}
        </Action>
        <Action label={entry.pinned ? "Unpin" : "Keep this one"} onClick={onPin}>
          {entry.pinned ? <PinOff size={10} strokeWidth={1.8} /> : <Pin size={10} strokeWidth={1.8} />}
        </Action>
        <Action label="Remove" onClick={onRemove}>
          <X size={10} strokeWidth={2.6} />
        </Action>
      </div>
    </div>
  );
}

function Action({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="relative -m-[3px] grid place-items-center rounded-[4px] p-[3px] text-white/60 hover:text-white/90 [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-[6.5px]"
    >
      {children}
    </button>
  );
}

function Thumb({ entry }: { entry: ClipboardEntry }) {
  const Icon =
    entry.kind === "image"
      ? ImageIcon
      : entry.kind === "files"
        ? File
        : entry.text.startsWith("http")
          ? Link2
          : AlignLeft;
  return (
    <span
      aria-hidden="true"
      className="grid size-[26px] shrink-0 place-items-center rounded-[4px] bg-white/14 text-white/60"
    >
      <Icon size={14} strokeWidth={1.5} fill={entry.kind === "files" ? "currentColor" : "none"} />
    </span>
  );
}

function Empty({ searching }: { searching: boolean }) {
  const Icon = searching ? Search : ClipboardList;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[4px]">
      <Icon aria-hidden="true" size={18} strokeWidth={1.6} className="text-white/45" />
      <p className="text-[10.5px] text-white/55">{searching ? "No matches" : "Nothing copied yet"}</p>
    </div>
  );
}

function writeClipboard(text: string) {
  try {
    void navigator.clipboard?.writeText(text).catch(() => {});
  } catch {
    // No clipboard access (insecure context, denied permission): the demo still works.
  }
}
