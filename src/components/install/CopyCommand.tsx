"use client";

import clsx from "clsx";
import { Fragment, useEffect, useRef, useState } from "react";
import { annotation } from "@/components/site/type";
import { announceCopied } from "@/components/install/copied";

/**
 * The install line in its well, with a Copy button that says what happened.
 *
 * The command is rendered character for character; the only additions are
 * <wbr> break opportunities, which a copy or a selection never includes; between
 * them the command does not wrap, so "| bash" never ends up alone on a line. The
 * code itself is `user-select: all`, so one click or tap selects the whole line
 * even where the button cannot write to the clipboard.
 *
 * Copy tries navigator.clipboard, then the selection + execCommand route; if
 * both fail it selects the command and says "Select it instead" rather than
 * claiming a success. A polite live region announces the result, cleared first
 * so a second copy is announced too.
 *
 * The well's lower lip is lit by a 1px line that wipes out from the centre on
 * first paint: a CSS animation, so the lit state is also what renders with no
 * JavaScript, and under reduced motion (the global rule shortens it to nothing).
 * A successful copy replays that same run, without the first-paint delay, and
 * announces itself on the window so the light under the notch can answer too
 * (see CopyBloom). Under reduced motion neither happens: the global rule would
 * turn 620ms into a flash, and the live region already says what occurred.
 *
 * Below md the well and the button stack. In a row the button is stretched to
 * the well's height — that is what makes it read as the second plane of the
 * well — so the row only starts once the command fits on one line, which it
 * does not at 640-767 at any size the well uses.
 */
export interface CopyCommandProps {
  /** The exact command. It is what gets copied, byte for byte. */
  command: string;
  /** Points in the command after which a line may break on narrow screens. */
  breaks?: readonly string[];
  /** A short line under the command, inside the well. */
  note?: string;
  className?: string;
  /**
   * REPLACES the command's responsive size steps (not appended to them: two
   * conflicting Tailwind utilities are resolved by their order in the
   * stylesheet, so appending one silently loses). The home band's column is
   * narrower than /install/'s at the same breakpoint, so it needs the small
   * step to survive longer.
   */
  sizeSteps?: string;
  /** REPLACES the well's own flex layout, for a column that must stack longer. */
  layoutClassName?: string;
}

type Status = "idle" | "copied" | "select";

const LABEL: Record<Status, string> = {
  idle: "Copy",
  copied: "Copied",
  select: "Select it instead",
};

export function CopyCommand({ command, breaks = [], note, className, sizeSteps, layoutClassName }: CopyCommandProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [announce, setAnnounce] = useState("");
  // 0 is first paint, which keeps the run's entrance delay; every copy after
  // that re-keys the line so the wipe runs again, immediately.
  const [lit, setLit] = useState(0);
  const codeRef = useRef<HTMLElement>(null);
  const timer = useRef<number>(0);
  const speak = useRef<number>(0);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(speak.current);
    },
    [],
  );

  const selectCommand = () => {
    const el = codeRef.current;
    if (!el) return false;
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return true;
    } catch {
      return false;
    }
  };

  const legacy = () => {
    if (!selectCommand()) return false;
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    }
  };

  const report = (next: Status) => {
    setStatus(next);
    // A live region speaks on a change; clear it, then set it, so the same
    // words are spoken again on a second copy.
    setAnnounce("");
    window.clearTimeout(speak.current);
    speak.current = window.setTimeout(
      () => setAnnounce(next === "copied" ? "Command copied." : "Couldn’t copy. The command is selected; copy it from there."),
      60,
    );
    window.clearTimeout(timer.current);
    if (next === "copied") {
      timer.current = window.setTimeout(() => setStatus("idle"), 1600);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setLit((n) => n + 1);
        announceCopied();
      }
    }
  };

  const onCopy = async () => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(command);
        report("copied");
        return;
      } catch {
        /* fall through to the selection route */
      }
    }
    if (legacy()) {
      window.getSelection()?.removeAllRanges();
      report("copied");
    } else {
      selectCommand();
      report("select");
    }
  };

  return (
    <div className={clsx("flex", layoutClassName ?? "flex-col md:flex-row md:items-stretch", className)}>
      <div className="relative min-w-0 flex-1 border-t border-black bg-[#0a0c10] px-4 py-4 sm:px-6 sm:py-5">
        <pre className="m-0 font-mono">
          <code
            ref={codeRef}
            translate="no"
            className={clsx(
              "block pl-[2ch] -indent-[2ch] leading-[1.55] whitespace-pre-wrap text-ink select-all [overflow-wrap:normal] [word-break:normal]",
              sizeSteps ?? "text-[15px] md:text-[16px] lg:text-[19px]",
            )}
          >
            {withBreaks(command, breaks)}
          </code>
        </pre>
        {note ? <p className={`mt-2 text-ink-3 ${annotation}`}>{note}</p> : null}
        {/* the lit lower lip: a hairline of lip light, and the run that arrives on it */}
        <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-px bg-lip/25" />
        <span
          key={lit}
          aria-hidden="true"
          style={{ animationDelay: lit === 0 ? "0.35s" : "0s" }}
          className="absolute inset-x-0 -bottom-px h-px origin-center animate-[soffit-lit-run_0.62s_var(--ease-soffit)_both] bg-[linear-gradient(90deg,transparent_0%,var(--color-lip)_50%,transparent_100%)] shadow-[0_1px_6px_0_color-mix(in_oklab,var(--color-spill-hot)_45%,transparent)]"
        />
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={clsx(
          "group relative flex h-12 shrink-0 cursor-pointer items-center justify-center border border-t-0 px-5 text-[13px] font-medium tracking-[0.02em] text-ink transition-colors duration-150 narrow md:h-auto md:min-w-[136px] md:border-t md:border-l-0",
          status === "idle" ? "border-lip/25 hover:border-lip/70" : "border-lip/70",
          "active:bg-white/[0.04]",
        )}
      >
        <span className="tnum">{LABEL[status]}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

function withBreaks(command: string, breaks: readonly string[]) {
  if (!breaks.length) return command;
  const parts: string[] = [];
  let rest = command;
  for (const b of breaks) {
    const at = rest.indexOf(b);
    if (at < 0) continue;
    parts.push(rest.slice(0, at + b.length));
    rest = rest.slice(at + b.length);
  }
  parts.push(rest);
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 ? <wbr /> : null}
      <span className="whitespace-nowrap">{p}</span>
    </Fragment>
  ));
}
