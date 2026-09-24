"use client";

import clsx from "clsx";
import { Inbox, Music2, Timer } from "lucide-react";
import { createContext, type ReactNode, type SVGProps, useContext } from "react";
import { HARDWARE, NOTCH } from "@/lib/notch";

export type Tab = "music" | "clipboard" | "shelf" | "timer" | "status" | "settings";

/** Where each glyph in the ears goes. See ExpandedShell's `navTo`. */
export type NavTargets = Partial<Record<Tab, string>>;

const NavContext = createContext<NavTargets | null>(null);

/**
 * Wrap a page's surfaces in this and every tab bar inside becomes real: each
 * glyph is a link to the section that draws that surface, so the strip moves
 * you through the page the way it moves you through the notch in the app.
 *
 * Opt-in, and deliberately so — on the home page the shell is a drawing, and
 * five links above the fold would be five tab stops before the headline.
 */
export function SurfaceNav({ to, children }: { to: NavTargets; children: ReactNode }) {
  return <NavContext value={to}>{children}</NavContext>;
}

type GlyphComponent = (props: { size: number; strokeWidth?: number }) => ReactNode;

const TITLE: Record<Tab, string> = {
  music: "Now Playing",
  clipboard: "Clipboard",
  shelf: "Shelf",
  timer: "Timers",
  status: "Status",
  settings: "Settings",
};

/**
 * ExpandedShell.swift + NotchNav.swift: every open surface shares this frame.
 *
 * The navigation lives in the two "ears" either side of the camera housing.
 * The middle HARDWARE.width × HARDWARE.height of the top edge is left empty on
 * purpose — there are no pixels behind the camera on the real display, so
 * anything drawn there would simply not exist. Content starts below it.
 *
 * Each ear lays its icons out at SurfaceMetrics.navPitch: the strip less 14pt,
 * shared between its icons, capped at 34pt, with no inset from the panel edge.
 * At the default 360pt panel that is 25.5pt for the three on the left and 34pt
 * for the two on the right, so the right-hand icons are the larger ones.
 */
export function ExpandedShell({
  active,
  leading = ["clipboard", "shelf", "timer"],
  trailing = ["status", "settings"],
  width = NOTCH.expanded.width,
  navTo,
  children,
}: {
  active: Tab;
  leading?: Tab[];
  trailing?: Tab[];
  width?: number;
  /**
   * Where each glyph goes. Given, the tab bar becomes real controls — the strip
   * drives the page the way it drives the notch in the app. Left out, the ears
   * are drawing: that is right on the home page, where the shell is decoration
   * and five extra tab stops above the fold would be a trap.
   */
  navTo?: NavTargets;
  children: ReactNode;
}) {
  const ear = (width - HARDWARE.width) / 2;
  const inherited = useContext(NavContext);
  const to = navTo ?? inherited;
  const live = !!to;
  return (
    <div
      className="absolute inset-0 font-[family-name:var(--font-system)]"
      role="group"
      aria-label={TITLE[active]}
    >
      <nav
        aria-hidden={live ? undefined : "true"}
        aria-label={live ? "Surfaces" : undefined}
        className="absolute top-0 left-0 flex items-center justify-start"
        style={{ width: ear, height: HARDWARE.height }}
      >
        {leading.map((t) => (
          <NavGlyph
            key={t}
            tab={t}
            active={t === active}
            pitch={navPitch(ear, leading.length)}
            href={to?.[t]}
          />
        ))}
      </nav>
      <nav
        aria-hidden={live ? undefined : "true"}
        aria-label={live ? "More" : undefined}
        className="absolute top-0 right-0 flex items-center justify-end"
        style={{ width: ear, height: HARDWARE.height }}
      >
        {trailing.map((t) => (
          <NavGlyph
            key={t}
            tab={t}
            active={t === active}
            pitch={navPitch(ear, trailing.length)}
            href={to?.[t]}
          />
        ))}
      </nav>
      <div className="absolute inset-x-0 bottom-0" style={{ top: HARDWARE.height }}>
        {children}
      </div>
    </div>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** SurfaceMetrics.navPitch at scale 1. */
function navPitch(strip: number, count: number) {
  return count > 0 ? clamp((strip - 14) / count, 0, 34) : 0;
}

/** NotchNav.swift NavButton: a (pitch − 3) × (pitch × 0.72) well, glyph at pitch × 0.46, semibold. */
function NavGlyph({
  tab,
  active,
  pitch,
  href,
}: {
  tab: Tab;
  active: boolean;
  pitch: number;
  href?: string;
}) {
  const Icon = GLYPH[tab];
  const glyph = clamp(pitch * 0.46, 8, 18);
  const well = (
    <span
      className={clsx(
        "grid place-items-center rounded-[5px] transition-colors duration-100",
        active ? "bg-surface-well text-surface-ink" : "text-white/40",
        href && !active && "group-hover:bg-white/10 group-hover:text-white/70",
        href && "group-active:bg-white/16",
      )}
      style={{ width: pitch - 3, height: clamp(pitch * 0.72, 14, 26) }}
    >
      {/* An SF Symbol at point size N is drawn about N tall; a 24-unit icon box draws ~20. */}
      <Icon size={glyph * 1.15} strokeWidth={2.3} />
    </span>
  );
  if (!href) {
    return (
      <span className="grid shrink-0 place-items-center" style={{ width: pitch }}>
        {well}
      </span>
    );
  }
  return (
    <a
      href={href}
      aria-label={TITLE[tab]}
      aria-current={active ? "true" : undefined}
      // The drawn glyph is 24 x 20 at most, which is under WCAG 2.2 AA's 24px
      // target on a touch screen. A coarse-pointer-only pseudo-element gives
      // the finger something to hit without changing what is drawn or how the
      // neighbours sit; on a mouse the target stays exactly the glyph.
      className="group relative grid shrink-0 cursor-pointer place-items-center rounded-[5px] outline-offset-2 before:absolute before:content-[''] focus-visible:outline-2 focus-visible:outline-lip [@media(pointer:coarse)]:before:-inset-x-[5px] [@media(pointer:coarse)]:before:-inset-y-[7px]"
      style={{ width: pitch }}
    >
      {well}
    </a>
  );
}

/* ── the three symbols lucide has no close match for ─────────────────────── */

function Svg({ size, children, ...rest }: { size: number; children: ReactNode } & SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} className="block" {...rest}>
      {children}
    </svg>
  );
}

/** gearshape.fill: a solid eight-tooth gear with the hub cut out. */
const GEAR = (() => {
  const teeth = 8;
  const rOut = 10.6;
  const rIn = 8.1;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    // each tooth: flat top across ±0.19 of a step, flanks down to the root
    for (const [r, f] of [
      [rIn, -0.36],
      [rOut, -0.2],
      [rOut, 0.2],
      [rIn, 0.36],
    ] as const) {
      const t = a + f * step;
      pts.push(`${(12 + r * Math.cos(t)).toFixed(2)} ${(12 + r * Math.sin(t)).toFixed(2)}`);
    }
  }
  const hub = 3.4;
  return `M${pts.join("L")}Z M${12 + hub} 12a${hub} ${hub} 0 1 0 ${-2 * hub} 0a${hub} ${hub} 0 1 0 ${2 * hub} 0Z`;
})();

function GearFill({ size }: { size: number }) {
  return (
    <Svg size={size}>
      <path d={GEAR} fill="currentColor" fillRule="evenodd" strokeLinejoin="round" stroke="currentColor" strokeWidth={0.8} />
    </Svg>
  );
}

/** gauge.with.dots.needle.33percent: a closed dial, a dotted scale over the top, a needle a third of the way round. */
const DIAL_DOTS = Array.from({ length: 7 }, (_, i) => {
  const deg = 210 - (i / 6) * 240;
  const a = (deg * Math.PI) / 180;
  return [12 + 6.4 * Math.cos(a), 12 - 6.4 * Math.sin(a)] as const;
});
const NEEDLE = (() => {
  const a = ((210 - 0.33 * 240) * Math.PI) / 180;
  return [12 + 5.6 * Math.cos(a), 12 - 5.6 * Math.sin(a)] as const;
})();

function GaugeDial({ size, strokeWidth = 2.3 }: { size: number; strokeWidth?: number }) {
  return (
    <Svg size={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      <circle cx={12} cy={12} r={10} />
      {DIAL_DOTS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={0.95} fill="currentColor" stroke="none" />
      ))}
      <path d={`M12 12L${NEEDLE[0].toFixed(2)} ${NEEDLE[1].toFixed(2)}`} />
      <circle cx={12} cy={12} r={1.9} fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** doc.on.clipboard: a clipboard with a sheet standing behind it, up and to the right. */
function DocOnClipboard({ size, strokeWidth = 2.3 }: { size: number; strokeWidth?: number }) {
  return (
    <Svg size={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round">
      <path d="M10 3.2h7.6a2.4 2.4 0 0 1 2.4 2.4v10.2a2.4 2.4 0 0 1-2.4 2.4" />
      <rect x={4} y={6.4} width={12} height={15.2} rx={2.4} />
      <rect x={6.9} y={4.6} width={6.2} height={3.4} rx={1.2} fill="currentColor" />
    </Svg>
  );
}

const GLYPH: Record<Tab, GlyphComponent> = {
  music: Music2,
  clipboard: DocOnClipboard,
  shelf: Inbox,
  timer: Timer,
  status: GaugeDial,
  settings: GearFill,
};
