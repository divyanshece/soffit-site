import type { ReactNode } from "react";

/* ── glyphs ──────────────────────────────────────────────────────────────── */

/*
 * The SF Symbols the app names (speaker.wave.N.fill, sun.min.fill, bolt.fill …),
 * redrawn as filled paths. `size` is the symbol's point size; the drawing is
 * about that tall, as an SF Symbol is at that font size.
 */
export type GlyphName =
  | "speaker"
  | "speaker1"
  | "speaker2"
  | "speaker3"
  | "speakerSlash"
  | "sunMin"
  | "sunMax"
  | "bolt"
  | "powerplug"
  | "checkCircle"
  | "battery0"
  | "battery25"
  | "battery50"
  | "battery75"
  | "battery100"
  | "batteryBolt"
  | "warning"
  | "headphones"
  | "airpods"
  | "hifispeaker"
  | "display"
  | "airplay";

const SPEAKER =
  "M1.6 7.1h2.8l4.5-3.7c.66-.54 1.6-.07 1.6.78v11.64c0 .85-.94 1.32-1.6.78l-4.5-3.7H1.6A1.6 1.6 0 0 1 0 11.3V8.7a1.6 1.6 0 0 1 1.6-1.6Z";

/** An arc of a speaker wave around the cone's mouth (10.5, 10). */
function wave(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const x = (10.5 + r * Math.cos(a)).toFixed(2);
  const dy = (r * Math.sin(a)).toFixed(2);
  return `M${x} ${(10 - +dy).toFixed(2)}A${r} ${r} 0 0 1 ${x} ${(10 + +dy).toFixed(2)}`;
}

function rays(r1: number, r2: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return `M${(10 + r1 * c).toFixed(2)} ${(10 + r1 * s).toFixed(2)}L${(10 + r2 * c).toFixed(2)} ${(10 + r2 * s).toFixed(2)}`;
  }).join("");
}

const KNOCKOUT = "var(--color-surface)";

/** battery.Npercent: a case, a terminal, and a fill `level` of the way across. */
function battery(level: number) {
  return (
    <>
      <rect x={0.7} y={0.7} width={21.6} height={11.6} rx={3.2} fill="none" stroke="currentColor" strokeWidth={1.3} opacity={0.45} />
      {level > 0 && <rect x={2.6} y={2.6} width={17.8 * level} height={7.8} rx={1.6} />}
      <rect x={23.5} y={4.3} width={1.9} height={4.4} rx={0.95} opacity={0.45} />
    </>
  );
}

const GLYPHS: Record<GlyphName, { box: [number, number, number, number]; draw: ReactNode }> = {
  speaker: { box: [0, 3, 11, 14], draw: <path d={SPEAKER} /> },
  speaker1: {
    box: [0, 3, 15, 14],
    draw: (
      <>
        <path d={SPEAKER} />
        <path d={wave(3.3, 42)} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
      </>
    ),
  },
  speaker2: {
    box: [0, 3, 18.4, 14],
    draw: (
      <>
        <path d={SPEAKER} />
        <path d={wave(3.3, 42) + wave(6.4, 45)} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
      </>
    ),
  },
  speaker3: {
    box: [0, 3, 21.4, 14],
    draw: (
      <>
        <path d={SPEAKER} />
        <path
          d={wave(3.3, 42) + wave(6.4, 45) + wave(9.5, 44)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      </>
    ),
  },
  speakerSlash: {
    box: [0, 1.5, 17, 17],
    draw: (
      <>
        <path d={SPEAKER} />
        <path d="M1.6 2.6 15.4 16.4" stroke={KNOCKOUT} strokeWidth={4} strokeLinecap="round" />
        <path d="M1.6 2.6 15.4 16.4" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
      </>
    ),
  },
  sunMin: {
    box: [1.5, 1.5, 17, 17],
    draw: (
      <>
        <circle cx={10} cy={10} r={4.1} />
        <path d={rays(6.9, 7.4)} stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  sunMax: {
    box: [0, 0, 20, 20],
    draw: (
      <>
        <circle cx={10} cy={10} r={4.3} />
        <path d={rays(6.9, 9.1)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
      </>
    ),
  },
  bolt: {
    box: [0, 0, 12, 20],
    draw: (
      <path
        d="M7.3 1 1.3 11.4h4.5L4.7 19l6-10.6H6.2Z"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    ),
  },
  powerplug: {
    box: [0, 0, 20, 14],
    draw: (
      <>
        <rect x={5.6} y={1.8} width={8.6} height={10.4} rx={2.2} />
        <rect x={13} y={3.7} width={6.2} height={1.9} rx={0.95} />
        <rect x={13} y={8.4} width={6.2} height={1.9} rx={0.95} />
        <rect x={0.4} y={6.05} width={6} height={1.9} rx={0.95} />
      </>
    ),
  },
  checkCircle: {
    box: [0, 0, 20, 20],
    draw: (
      <>
        <circle cx={10} cy={10} r={9.2} />
        <path
          d="M5.9 10.4 8.7 13.1 14.2 7.1"
          fill="none"
          stroke={KNOCKOUT}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  battery0: { box: [0, 0, 26, 13], draw: battery(0) },
  battery25: { box: [0, 0, 26, 13], draw: battery(0.25) },
  battery50: { box: [0, 0, 26, 13], draw: battery(0.5) },
  battery75: { box: [0, 0, 26, 13], draw: battery(0.75) },
  battery100: { box: [0, 0, 26, 13], draw: battery(1) },
  batteryBolt: {
    box: [0, 0, 26, 13],
    draw: (
      <>
        {battery(1)}
        <path d="M13.4 1.6 8.6 7.3h3l-1 4.1 4.8-5.7h-3Z" fill={KNOCKOUT} stroke={KNOCKOUT} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M13.4 1.6 8.6 7.3h3l-1 4.1 4.8-5.7h-3Z" />
      </>
    ),
  },
  warning: {
    box: [0, 0, 20, 18],
    draw: (
      <>
        <path d="M8.3 1.6a2 2 0 0 1 3.4 0l7.7 13.4a2 2 0 0 1-1.7 3H2.3a2 2 0 0 1-1.7-3Z" />
        <path d="M10 6.2v4.9" stroke={KNOCKOUT} strokeWidth={2} strokeLinecap="round" />
        <circle cx={10} cy={14.2} r={1.15} fill={KNOCKOUT} />
      </>
    ),
  },
  headphones: {
    box: [0, 0, 20, 18],
    draw: (
      <>
        <path d="M3.3 11V9.2a6.7 6.7 0 0 1 13.4 0V11" fill="none" stroke="currentColor" strokeWidth={1.8} />
        <rect x={1.4} y={10} width={4.4} height={7.4} rx={1.7} />
        <rect x={14.2} y={10} width={4.4} height={7.4} rx={1.7} />
      </>
    ),
  },
  airpods: {
    box: [0, 0, 20, 18],
    draw: (
      <>
        <circle cx={5.4} cy={5} r={3.9} />
        <rect x={6.6} y={5} width={2.2} height={12} rx={1.1} />
        <circle cx={14.6} cy={5} r={3.9} />
        <rect x={11.2} y={5} width={2.2} height={12} rx={1.1} />
      </>
    ),
  },
  hifispeaker: {
    box: [0, 0, 14, 20],
    draw: (
      <>
        <rect x={0.5} y={0.5} width={13} height={19} rx={2.8} />
        <circle cx={7} cy={5} r={1.7} fill={KNOCKOUT} />
        <circle cx={7} cy={13} r={3.6} fill={KNOCKOUT} />
      </>
    ),
  },
  display: {
    box: [0, 0, 22, 18],
    draw: (
      <>
        <rect x={0.8} y={0.8} width={20.4} height={12.8} rx={2} />
        <rect x={7} y={15.6} width={8} height={1.9} rx={0.95} />
      </>
    ),
  },
  airplay: {
    box: [0, 0, 20, 20],
    draw: (
      <>
        <path
          d="M5.4 14.2A6.5 6.5 0 1 1 14.6 14.2M7.9 11.8A3 3 0 1 1 12.1 11.8"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
        />
        <path d="M10 12.2 15 19H5Z" strokeLinejoin="round" stroke="currentColor" strokeWidth={0.8} />
      </>
    ),
  },
};

export function Glyph({ name, size }: { name: GlyphName; size: number }) {
  const { box, draw } = GLYPHS[name];
  const [x, y, w, h] = box;
  // SF Symbols of one point size share a cap height, so height is fixed and
  // width follows the drawing. Taller-than-wide glyphs sit a touch smaller.
  const height = size * (w >= h ? 0.8 : 0.95);
  return (
    <svg
      aria-hidden="true"
      viewBox={`${x} ${y} ${w} ${h}`}
      height={height}
      width={(height * w) / h}
      fill="currentColor"
      className="block overflow-visible"
    >
      {draw}
    </svg>
  );
}
