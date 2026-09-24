"use client";

import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { HARDWARE, LAND_SPRING, NOTCH } from "@/lib/notch";
import { Equaliser } from "./Equaliser";
import { ExpandedShell } from "./ExpandedShell";

/**
 * NowPlayingViews.swift, redrawn.
 *
 *   <NowPlaying/>          NowPlayingExpandedView — the full player, shown on hover
 *   <NowPlayingActivity/>  NowPlayingActivityView — the readout that drops out of
 *                          the notch for a moment when a track changes
 *
 * Every size is the Swift one resolved through SurfaceMetrics: the expanded
 * panel (360 × 162, 130pt under the housing) resolves to scale 1; the activity
 * panel (227 × 78, 46pt under it) to the 0.8 floor. Tracks and artists are
 * invented, and the artwork is drawn here — no stock images, no real records.
 *
 * The clock follows NowPlaying.swift: position is anchored, never accumulated.
 *     position(now) = anchor + (now − anchorTime) × rate
 * Play, pause, seek and track change re-anchor; a 0.25s tick only re-reads it,
 * and stops whenever the player is paused, off screen or in a hidden tab. Losing
 * ticks loses nothing, because nothing was ever being added up.
 */

export type ArtworkStyle = "planes" | "sodium" | "rooms";

export interface Track {
  title: string;
  artist: string;
  /** seconds */
  duration: number;
  art: ArtworkStyle;
}

/** A plausible, entirely fictional queue. */
export const TRACKS: Track[] = [
  { title: "Soft Architecture", artist: "Nell Havard", duration: 228, art: "planes" },
  { title: "Sodium Hours", artist: "Orla Venn", duration: 252, art: "sodium" },
  { title: "Small Rooms", artist: "The Lanterne Quartet", duration: 185, art: "rooms" },
];

/** NowPlayingTrack.timestamp: `1:04` / `1:02:33`, floor, never negative. */
export function timestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0 || seconds >= 86_400) return "--:--";
  const t = Math.floor(seconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// ─── the expanded player ─────────────────────────────────────────────────────

/** SurfaceMetrics for the expanded panel. scale = 1. */
const X = {
  side: NOTCH.expanded.width * 0.055, // sidePadding, 19.8
  art: NOTCH.expanded.height - HARDWARE.height - 22, // contentHeight − space(22) = 108
} as const;

interface Clock {
  index: number;
  /** position in seconds as of anchorTime */
  anchor: number;
  /** performance.now() when anchor was taken; null until mounted, so the server and the first client render agree */
  anchorTime: number | null;
  /** 1 playing, 0 paused */
  rate: 0 | 1;
}

export function NowPlaying({
  tracks = TRACKS,
  initialTrack = 0,
  initialPosition = 71,
  initialPlaying = true,
  onTrackChange,
  onTransport,
}: {
  /** The queue next / previous walk through. Defaults to the fictional TRACKS. */
  tracks?: Track[];
  /** Index into `tracks` to start on. */
  initialTrack?: number;
  /** Seconds into the first track. Rendered as-is on the server. */
  initialPosition?: number;
  /** Whether the clock is running when the surface mounts. */
  initialPlaying?: boolean;
  /** Called after next / previous / end-of-track change the track — hook a <NowPlayingActivity/> to it. */
  onTrackChange?: (track: Track, index: number) => void;
  /** Called after play / pause, with what was pressed — NowPlayingActivityView's `transport`. */
  onTransport?: (transport: "play" | "pause") => void;
}) {
  const [clock, setClock] = useState<Clock>({
    index: initialTrack % tracks.length,
    anchor: initialPosition,
    anchorTime: null,
    rate: initialPlaying ? 1 : 0,
  });
  const [now, setNow] = useState<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const track = tracks[clock.index];
  const playing = clock.rate > 0;

  const positionAt = useCallback(
    (c: Clock, t: number | null) => {
      const d = tracks[c.index].duration;
      const raw = c.anchorTime == null || t == null ? c.anchor : c.anchor + ((t - c.anchorTime) / 1000) * c.rate;
      return Math.min(d, Math.max(0, raw));
    },
    [tracks],
  );

  // The 0.25s re-read — only while playing, on screen and in a visible tab.
  useEffect(() => {
    const el = root.current;
    if (!el || !playing) return;
    let id = 0;
    let onScreen = true;
    const run = () => {
      window.clearInterval(id);
      id = 0;
      if (onScreen && document.visibilityState === "visible") {
        const t = performance.now();
        // First tick after mount anchors the clock: the moment the page can know what "now" is.
        setClock((c) => (c.anchorTime == null ? { ...c, anchorTime: t } : c));
        setNow(t);
        id = window.setInterval(() => setNow(performance.now()), 250);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      run();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", run);
    run();
    return () => {
      window.clearInterval(id);
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
    };
  }, [playing]);

  const position = positionAt(clock, now);

  const changeTrack = useCallback(
    (index: number) => {
      const t = performance.now();
      setClock((c) => ({ ...c, index, anchor: 0, anchorTime: t }));
      setNow(t);
      onTrackChange?.(tracks[index], index);
    },
    [onTrackChange, tracks],
  );

  // The music player moves on by itself at the end of a track: one timeout, set
  // for the moment the anchored clock reaches the track's duration.
  useEffect(() => {
    if (!playing || clock.anchorTime == null) return;
    const endsAt = clock.anchorTime + (track.duration - clock.anchor) * 1000;
    const id = window.setTimeout(
      () => changeTrack((clock.index + 1) % tracks.length),
      Math.max(0, endsAt - performance.now()),
    );
    return () => window.clearTimeout(id);
  }, [playing, clock.anchorTime, clock.anchor, clock.index, track.duration, tracks.length, changeTrack]);

  const playPause = () => {
    const t = performance.now();
    const next: 0 | 1 = playing ? 0 : 1;
    setClock((c) => ({ ...c, anchor: positionAt(c, t), anchorTime: t, rate: next }));
    setNow(t);
    onTransport?.(next ? "play" : "pause");
  };

  const seek = (fraction: number) => {
    const t = performance.now();
    setClock((c) => ({ ...c, anchor: fraction * tracks[c.index].duration, anchorTime: t }));
    setNow(t);
  };

  // Music's rule: previous restarts the track unless you are already near its start.
  const previous = () => {
    if (positionAt(clock, performance.now()) > 3) seek(0);
    else changeTrack((clock.index - 1 + tracks.length) % tracks.length);
  };
  const next = () => changeTrack((clock.index + 1) % tracks.length);

  const fraction = preview ?? (track.duration > 0 ? position / track.duration : 0);
  const elapsed = preview != null ? timestamp(preview * track.duration) : timestamp(position);
  const remaining = track.duration > 0 ? `-${timestamp(Math.max(0, track.duration - position))}` : "--:--";

  return (
    <ExpandedShell active="music" leading={["music", "clipboard", "shelf", "timer"]}>
      <div ref={root} className="flex h-full flex-col">
        <div className="flex items-center gap-[13px]" style={{ paddingInline: X.side }}>
          <div className="relative shrink-0">
            <Artwork style={track.art} side={X.art} radius={9} />
            <SourceBadge size={15} pad={3} offset={5} backing={0.65} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-[5px]">
            <div className="flex w-full flex-col items-center gap-px">
              <div className="flex max-w-full items-center gap-[7px]">
                <p className="truncate text-[14px] leading-[17px] font-semibold text-white">{track.title}</p>
                {playing ? <Equaliser playing width={12} height={10} className="shrink-0" /> : null}
              </div>
              <p className="max-w-full truncate text-[11px] leading-[13px] text-white/50">{track.artist}</p>
            </div>

            <div className="tnum flex w-full items-center gap-[7px] text-[9.5px] leading-none text-white/45">
              <span className="w-[34px] shrink-0 text-left" suppressHydrationWarning>
                {elapsed}
              </span>
              <ScrubBar
                fraction={fraction}
                duration={track.duration}
                position={position}
                title={track.title}
                onPreview={setPreview}
                onCommit={(f) => {
                  seek(f);
                  setPreview(null);
                }}
              />
              <span className="w-[38px] shrink-0 text-right" suppressHydrationWarning>
                {remaining}
              </span>
            </div>

            <div className="flex items-center gap-[22px]">
              <TransportButton size={13} label="Previous track" onClick={previous}>
                <SkipGlyph dir="back" />
              </TransportButton>
              <TransportButton size={16} label={playing ? "Pause" : "Play"} onClick={playPause}>
                {playing ? <PauseGlyph size={16} /> : <PlayGlyph size={16} />}
              </TransportButton>
              <TransportButton size={13} label="Next track" onClick={next}>
                <SkipGlyph dir="forward" />
              </TransportButton>
            </div>
          </div>
        </div>
        {/* Spacer(minLength: space(8)) — the row hangs from the housing. */}
        <div className="min-h-[8px] flex-1" />
      </div>
    </ExpandedShell>
  );
}

/**
 * ScrubBar: a 3pt line in a 13pt-tall target. Click anywhere to jump, drag to
 * scrub; the knob shows only while hovering, dragging or focused. It is also a
 * real slider for the keyboard: arrows step five seconds, Home and End jump.
 */
function ScrubBar({
  fraction,
  duration,
  position,
  title,
  onPreview,
  onCommit,
}: {
  fraction: number;
  duration: number;
  position: number;
  title: string;
  onPreview: (f: number | null) => void;
  onCommit: (f: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const seekable = duration > 0;

  // If the capture above was refused, a release outside the track never reaches
  // the element and the drag would never end. This is the backstop.
  useEffect(() => {
    if (!dragging) return;
    const end = () => {
      setDragging(false);
      onPreview(null);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragging, onPreview]);

  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(r.width, 1)));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!seekable) return;
    const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key];
    let target: number | null = null;
    if (step != null) target = position + step;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = duration;
    if (target == null) return;
    e.preventDefault();
    onCommit(Math.min(1, Math.max(0, target / duration)));
  };

  const f = Math.min(1, Math.max(0, fraction));
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={`Position in ${title}`}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(f * duration)}
      aria-valuetext={`${timestamp(f * duration)} of ${timestamp(duration)}`}
      className={clsx(
        "group relative h-[13px] min-w-0 flex-1 cursor-pointer touch-pan-y rounded-full outline-offset-1",
        // On a finger the 13pt line is not a target. The extension grows upward,
        // into the artist line, because the transport row sits 5pt below and a
        // positioned ::before would paint over the top of Play / Prev / Next.
        "[@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:inset-x-0",
        // Only 1pt of the 5pt gap, so the transport buttons can take 3pt of it
        // for their own coarse extension and still clear this one.
        "[@media(pointer:coarse)]:before:-top-[20px] [@media(pointer:coarse)]:before:-bottom-[1px]",
      )}
      onPointerDown={(e) => {
        if (!seekable || e.button !== 0) return;
        setDragging(true);
        onPreview(at(e));
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // A pointer the browser no longer tracks. The drag still follows moves
          // over the element; the window-level release below ends it either way.
        }
      }}
      onPointerMove={(e) => {
        if (dragging) onPreview(at(e));
      }}
      onPointerUp={(e) => {
        if (!dragging) return;
        setDragging(false);
        onCommit(at(e));
      }}
      onPointerCancel={() => {
        setDragging(false);
        onPreview(null);
      }}
      onKeyDown={onKey}
    >
      <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/18" />
      <span
        className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full bg-white/85"
        style={{ width: `max(2px, ${f * 100}%)` }}
      />
      <span
        className={clsx(
          "absolute top-1/2 size-[8px] -translate-y-1/2 rounded-full bg-white transition-opacity duration-[120ms] ease-out",
          dragging
            ? "opacity-100"
            : // Nothing hovers on a finger, so the handle has to be there at rest.
              "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100",
        )}
        style={{ left: `clamp(0px, calc(${f * 100}% - 4px), calc(100% - 8px))` }}
      />
    </div>
  );
}

/** TransportButton: a small glyph in a generous, invisible target — (size + 16) × (size + 12). */
function TransportButton({
  size,
  label,
  onClick,
  children,
}: {
  size: number;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "relative grid cursor-pointer place-items-center rounded-[6px] text-white/80 transition-colors duration-100 hover:text-white active:text-white/60",
        // (size + 16) × (size + 12) is generous for a pointer but still under
        // 24 CSS px tall once the phone stage is scaled down, so a finger gets
        // 3pt more each way. The 22pt gaps keep the neighbours clear.
        "[@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-y-[3px] [@media(pointer:coarse)]:before:inset-x-0",
      )}
      style={{ width: size + 16, height: size + 12 }}
    >
      {children}
    </button>
  );
}

// ─── the activity readout ────────────────────────────────────────────────────

/** SurfaceMetrics for the activity panel (227 × 78): scale clamps to 0.8. */
const A = {
  side: NOTCH.activity.width * 0.055, // sidePadding, 12.5
  art: Math.min(60, Math.max(22, (NOTCH.activity.height - HARDWARE.height) * 0.55)), // 25.3
} as const;

export function NowPlayingActivity({
  track = TRACKS[0],
  playing = true,
  transport,
}: {
  /** What to introduce. */
  track?: Track;
  /** track.isPlaying — decides between the moving bars and a still pause glyph. */
  playing?: boolean;
  /**
   * Why the readout appeared. Omitted: a new track introducing itself (artist
   * under the title, bars on the right). "play" / "pause": confirming a press —
   * the pressed symbol in a filled well, and "Paused" under the title on pause.
   * Remount (change `key`) to replay the entrance, as the app does per event.
   */
  transport?: "play" | "pause";
}) {
  const reduced = useReducedMotion();
  const subtitle = transport === "pause" ? "Paused" : track.artist;

  return (
    <div className="absolute inset-0 flex flex-col font-[family-name:var(--font-system)] text-white">
      <div className="flex-1" style={{ minHeight: HARDWARE.height }} />
      <motion.div
        className="flex items-center gap-[7px]"
        style={{ paddingInline: A.side }}
        initial={reduced ? false : { opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={LAND_SPRING}
      >
        <div className="relative shrink-0">
          <Artwork style={track.art} side={A.art} radius={3} />
          <SourceBadge size={8} pad={1.5} offset={4} backing={0.7} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[9px] leading-[11px] font-semibold">{track.title}</p>
          <p className="truncate text-[8px] leading-[10px] text-white/50">{subtitle}</p>
        </div>
        <div className="min-w-[4px] flex-1" />
        {transport ? (
          <motion.span
            key={transport}
            className="grid size-[18px] shrink-0 place-items-center rounded-full bg-white/16 text-accent"
            initial={reduced ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={LAND_SPRING}
          >
            {transport === "play" ? <PlayGlyph size={8} /> : <PauseGlyph size={8} />}
          </motion.span>
        ) : playing ? (
          <Equaliser playing width={10} height={10} className="shrink-0" />
        ) : (
          <span className="shrink-0 text-accent">
            <PauseGlyph size={9} />
          </span>
        )}
      </motion.div>
      <div className="flex-1" style={{ minHeight: 6 }} />
    </div>
  );
}

// ─── pieces ──────────────────────────────────────────────────────────────────

/**
 * Artwork, drawn rather than fetched: three invented sleeves, each a single
 * idea at small size. ArtworkView's 0.5pt separator border sits on top.
 */
export function Artwork({ style, side, radius }: { style: ArtworkStyle; side: number; radius: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="relative overflow-hidden" style={{ width: side, height: side, borderRadius: radius }}>
      <svg viewBox="0 0 100 100" width={side} height={side} aria-hidden="true" className="block">
        {style === "planes" ? (
          <>
            <defs>
              <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3a414b" />
                <stop offset="1" stopColor="#0d1015" />
              </linearGradient>
              <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffc785" stopOpacity="0.9" />
                <stop offset="0.35" stopColor="#fc7338" stopOpacity="0.45" />
                <stop offset="1" stopColor="#e65224" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill={`url(#${id}g)`} />
            <rect x="0" y="58" width="100" height="42" fill="#0b0d11" />
            <rect x="0" y="58" width="100" height="22" fill={`url(#${id}s)`} />
            <rect x="0" y="38" width="100" height="20" fill="#1b1f25" />
            <rect x="0" y="57.2" width="100" height="0.8" fill="#ffc785" />
            <rect x="0" y="22" width="100" height="16" fill="#2a2f37" />
          </>
        ) : style === "sodium" ? (
          <>
            <defs>
              <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#141a2c" />
                <stop offset="0.7" stopColor="#3b2b3f" />
                <stop offset="1" stopColor="#6a3b2e" />
              </linearGradient>
              <radialGradient id={`${id}r`} cx="0.68" cy="0.34" r="0.42">
                <stop offset="0" stopColor="#ffa857" stopOpacity="0.55" />
                <stop offset="1" stopColor="#ffa857" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill={`url(#${id}g)`} />
            <rect width="100" height="100" fill={`url(#${id}r)`} />
            <circle cx="68" cy="34" r="9" fill="#ffc785" />
            <rect x="67.2" y="43" width="1.6" height="57" fill="#0d0f16" />
            <path d="M0 82 L22 76 L40 80 L58 72 L100 78 L100 100 L0 100 Z" fill="#0d0f16" />
          </>
        ) : (
          <>
            <defs>
              <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#56645a" />
                <stop offset="1" stopColor="#1f2621" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" fill={`url(#${id}g)`} />
            {[0, 1, 2].flatMap((r) =>
              [0, 1, 2].map((c) => (
                <rect
                  key={`${r}${c}`}
                  x={22 + c * 20}
                  y={22 + r * 20}
                  width="14"
                  height="14"
                  rx="1.5"
                  fill={r === 1 && c === 2 ? "#ffc785" : "#10140f"}
                  fillOpacity={r === 1 && c === 2 ? 1 : 0.55}
                />
              )),
            )}
          </>
        )}
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ borderRadius: radius, boxShadow: "inset 0 0 0 0.5px rgb(255 255 255 / 0.1)" }}
      />
    </div>
  );
}

/**
 * SourceBadge at its fallback: the app draws the player's own icon here; with
 * no player to borrow one from, it draws a music note — which is what this does.
 */
function SourceBadge({ size, pad, offset, backing }: { size: number; pad: number; offset: number; backing: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute grid place-items-center rounded-full"
      style={{ right: -offset, bottom: -offset, padding: pad, background: `rgb(0 0 0 / ${backing})` }}
    >
      <span className="grid place-items-center text-white/60" style={{ width: size, height: size }}>
        <NoteGlyph size={size * 0.8} />
      </span>
    </span>
  );
}

// SF Symbols, redrawn. Sizes are the point size the app sets them at.

function NoteGlyph({ size }: { size: number }) {
  return (
    <svg width={size * 0.72} height={size} viewBox="0 0 10 14" aria-hidden="true" fill="currentColor">
      <ellipse cx="3.3" cy="11.3" rx="3.1" ry="2.4" transform="rotate(-18 3.3 11.3)" />
      <rect x="5.3" y="0.6" width="1.3" height="11" rx="0.4" />
      <path d="M5.9 0.6 C 7.6 1.6 9.6 2.6 9.6 5.4 C 9.6 6.2 9.3 6.9 9 7.3 C 9.1 5.2 7.8 4.3 5.9 3.8 Z" />
    </svg>
  );
}

function PlayGlyph({ size }: { size: number }) {
  // play.fill: a softened triangle, ~0.8em wide, ~0.95em tall.
  return (
    <svg width={size * 0.8} height={size * 0.95} viewBox="0 0 12 14" aria-hidden="true" className="block">
      <path
        d="M1.6 1.4 L11 7 L1.6 12.6 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        transform="translate(0.4 0)"
      />
    </svg>
  );
}

function PauseGlyph({ size }: { size: number }) {
  // pause.fill: two rounded bars.
  return (
    <svg width={size * 0.66} height={size * 0.92} viewBox="0 0 10 14" aria-hidden="true" className="block" fill="currentColor">
      <rect x="0.5" y="0.5" width="3.3" height="13" rx="1" />
      <rect x="6.2" y="0.5" width="3.3" height="13" rx="1" />
    </svg>
  );
}

function SkipGlyph({ dir }: { dir: "back" | "forward" }) {
  // backward.fill / forward.fill at 13pt: two filled triangles nose to tail.
  return (
    <svg
      width={19}
      height={11}
      viewBox="0 0 20 12"
      aria-hidden="true"
      className="block"
      style={dir === "forward" ? { transform: "scaleX(-1)" } : undefined}
    >
      <g fill="currentColor" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
        <path d="M1 6 L9.5 1 L9.5 11 Z" />
        <path d="M10 6 L18.5 1 L18.5 11 Z" />
      </g>
    </svg>
  );
}
