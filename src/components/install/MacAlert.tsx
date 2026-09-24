import clsx from "clsx";
import Image from "next/image";

/**
 * A macOS alert, redrawn from a real one.
 *
 * Checked against a genuine Gatekeeper dialog captured on macOS 26
 * (reference/gatekeeper-not-opened.png): the icon sits top-left, the text is
 * left-aligned beneath it, the buttons are stacked full-width rather than side
 * by side, the default button is on top, and there is a help button in the top
 * right corner.
 *
 * It is a drawing, not a control — the buttons are spans, so nothing on the page
 * pretends to be a button it isn't. The words are real text, so a screen reader
 * reads the dialog exactly as macOS words it.
 *
 * The macOS colours below (window fill, system blue, push-button fill) are the
 * system's, not the site's; they live here and nowhere else.
 */
export interface MacAlertButton {
  label: string;
  /** The default button: system blue, and the one Return presses. */
  primary?: boolean;
}

export interface MacAlertProps {
  /** Bold first line. */
  title: string;
  /** The informative text under it. */
  message: string;
  /** Top to bottom, as macOS stacks them. The default button goes first. */
  buttons: readonly MacAlertButton[];
  /**
   * "security" draws the Privacy & Security badge with its warning triangle,
   * which is what Gatekeeper's own alert shows. Anything else is a path to an
   * app icon.
   */
  icon?: "security" | (string & {});
  className?: string;
}

export function MacAlert({ title, message, buttons, icon = "security", className }: MacAlertProps) {
  return (
    <div
      className={clsx(
        "relative w-[264px] rounded-[12px] bg-[#28282b] px-5 pt-5 pb-5 text-white font-[family-name:var(--font-system)]",
        "shadow-[0_0_0_0.5px_rgb(0_0_0/0.9),inset_0_0_0_0.5px_rgb(255_255_255/0.16),0_22px_48px_-8px_rgb(0_0_0/0.65)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute top-3 right-3 grid size-[22px] place-items-center rounded-full bg-white/[0.14] text-[13px] leading-none font-medium text-white/80"
      >
        ?
      </span>

      {icon === "security" ? (
        <SecurityBadge />
      ) : (
        <Image src={icon} alt="" width={64} height={64} className="size-16" />
      )}

      <p className="mt-4 text-[13px] leading-4 font-bold">{title}</p>
      <p className="mt-2 text-[11.5px] leading-[15px] text-white/85">{message}</p>

      <div className="mt-4 flex flex-col gap-1.5">
        {buttons.map((b) => (
          <span
            key={b.label}
            className={clsx(
              "flex h-[26px] items-center justify-center rounded-[7px] px-2 text-[13px] leading-none whitespace-nowrap",
              b.primary
                ? "bg-[#0a7cff] shadow-[inset_0_0.5px_0_rgb(255_255_255/0.25)]"
                : "bg-white/[0.16] shadow-[inset_0_0.5px_0_rgb(255_255_255/0.12)]",
            )}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The Privacy & Security badge with its warning triangle — redrawn, not Apple's
 * artwork: a brushed dial on a rounded tile, with the yellow triangle sitting
 * over its lower right corner, which is the shape Gatekeeper's alert shows.
 */
function SecurityBadge() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="block">
      <defs>
        <linearGradient id="mac-alert-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f2f4" />
          <stop offset="1" stopColor="#c9c9ce" />
        </linearGradient>
        <linearGradient id="mac-alert-dial" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#8b8b93" />
          <stop offset="1" stopColor="#5d5d66" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="50" height="50" rx="11" fill="url(#mac-alert-tile)" />
      <circle cx="27" cy="27" r="17" fill="#6f6f78" />
      <circle cx="27" cy="27" r="14" fill="url(#mac-alert-dial)" />
      {/* the dial's knurling */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={27 + Math.cos(a) * 10.5}
            y1={27 + Math.sin(a) * 10.5}
            x2={27 + Math.cos(a) * 13.5}
            y2={27 + Math.sin(a) * 13.5}
            stroke="#3f3f47"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.75"
          />
        );
      })}
      <circle cx="27" cy="27" r="6" fill="#9a9aa2" />
      <circle cx="27" cy="27" r="6" fill="none" stroke="#4a4a52" strokeWidth="1" />
      <path d="M27 15.5v3" stroke="#3f3f47" strokeWidth="1.8" strokeLinecap="round" />
      {/* warning triangle, lower right */}
      <path
        d="M43.6 33.2a3.1 3.1 0 0 1 5.4 0l10.6 18.5a3.1 3.1 0 0 1-2.7 4.7H35.7a3.1 3.1 0 0 1-2.7-4.7z"
        fill="#f5c518"
        stroke="#28282b"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M46.3 41.4v6.4" stroke="#3a2f00" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="46.3" cy="51.7" r="1.5" fill="#3a2f00" />
    </svg>
  );
}
