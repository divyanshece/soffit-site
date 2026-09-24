import clsx from "clsx";

/**
 * A slice of System Settings › Privacy & Security, dark appearance, scrolled to
 * the Security section: the "Allow applications from" row, and — in a second
 * group below it, as the real pane draws it — the row that appears after a
 * blocked launch with its Open Anyway button and the reason under a hairline.
 *
 * Drawn at real point sizes (13pt rows, 10pt-corner inset group) but fluid in
 * width, so on a phone the row wraps the way the real pane does when narrowed,
 * instead of the whole window scaling down to unreadable. Like MacAlert it is a
 * drawing: the controls are spans, the words are real text.
 */
export function SecuritySettings({ app = "Soffit", className }: { app?: string; className?: string }) {
  return (
    <div
      className={clsx(
        "w-full max-w-[500px] overflow-hidden rounded-[10px] bg-[#1e1e20] text-white font-[family-name:var(--font-system)]",
        "shadow-[0_0_0_0.5px_rgb(0_0_0/0.9),inset_0_0_0_0.5px_rgb(255_255_255/0.14),0_22px_48px_-8px_rgb(0_0_0/0.6)]",
        className,
      )}
    >
      {/* toolbar: traffic lights, back/forward, the pane's title */}
      <div className="flex h-[38px] items-center gap-3 border-b border-black/60 bg-[#2a2a2c] px-3">
        <span aria-hidden="true" className="flex gap-2">
          <i className="size-3 rounded-full bg-[#ff5f57]" />
          <i className="size-3 rounded-full bg-[#febc2e]" />
          <i className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span aria-hidden="true" className="ml-1 flex gap-3 text-white/35">
          <Chevron dir="left" />
          <Chevron dir="right" />
        </span>
        <span className="truncate text-[13px] font-semibold">Privacy &amp; Security</span>
      </div>

      <div className="px-4 pt-4 pb-5 sm:px-5">
        <p className="mb-2 px-0.5 text-[13px] font-bold">Security</p>
        {/* Two groups, not one: the setting sits alone, and the blocked launch
            comes back as its own group below it, separated by window
            background. Only the reason under the blocked row shares a group
            with it, under a hairline. */}
        <div className="space-y-[9px]">
          <div className="rounded-[10px] bg-white/[0.045] shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.08)]">
            <div className="flex items-center justify-between gap-3 px-3 py-[9px] text-[13px]">
              <span className="min-w-0">Allow applications from</span>
              <span className="flex shrink-0 items-center gap-1 text-white/85">
                <span className="hidden min-[420px]:inline">App Store &amp; Known Developers</span>
                <span className="min-[420px]:hidden">App Store &amp; Known…</span>
                <UpDown />
              </span>
            </div>
          </div>
          <div className="rounded-[10px] bg-white/[0.045] shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.08)]">
            <div className="flex items-center justify-between gap-3 px-3 py-[9px] text-[13px]">
              <span className="min-w-0 leading-4">
                “{app}” was blocked to protect your Mac.
              </span>
              <span className="relative flex h-[22px] shrink-0 items-center rounded-[5px] bg-white/[0.2] px-2.5 text-[13px] leading-none shadow-[inset_0_0.5px_0_rgb(255_255_255/0.12)]">
                Open Anyway
              </span>
            </div>
            {/* macOS repeats the reason under a separator, inside the same group */}
            <div className="mx-3 h-px bg-white/[0.08]" />
            <p className="px-3 py-[9px] text-[11px] leading-[15px] text-white/55">
              Apple could not verify “{app}” is free of malware that may harm your Mac or compromise
              your privacy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" className={dir === "right" ? "scale-x-[-1]" : undefined}>
      <path d="M6.5 1.5 1.5 6.5l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UpDown() {
  return (
    <svg aria-hidden="true" width="7" height="11" viewBox="0 0 7 11" fill="none" className="opacity-70">
      <path d="M1 4 3.5 1.5 6 4M1 7l2.5 2.5L6 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
