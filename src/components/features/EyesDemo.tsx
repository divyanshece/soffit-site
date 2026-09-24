"use client";

import { BatteryCharging, Search, Wifi } from "lucide-react";
import { HARDWARE } from "@/lib/notch";
import { Eyes } from "@/components/surfaces/Eyes";
import { Stage } from "./Stage";

/**
 * The eyes, enlarged: a detail of the right-hand end of the menu bar, drawn at
 * its real 32pt and scaled up, the way a drawing blows up a junction.
 *
 * One pair, and it is live: it follows the pointer anywhere on the page and
 * winks the eye on the side of the button you click. The drowsy pose that used
 * to sit beside it was a still image of a behaviour /about/ shows happening for
 * real, on a compressed ramp — a drawing asking to be taken at its word.
 */
export function EyesDemo() {
  return (
    <Detail caption="The left eye answers a left click.">
      <Eyes />
    </Detail>
  );
}

function Detail({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure className="max-w-[400px]">
      <Stage size={{ width: 200, height: 44 }} phone={{ width: 200, height: 44 }} maxScale={3.2} bleed={false}>
        {() => (
          <div
            className="absolute inset-x-0 top-0 flex items-center justify-end gap-[12px] pr-[12px] font-[family-name:var(--font-system)] text-white"
            style={{ height: HARDWARE.height, background: "rgb(0 0 0 / 0.26)" }}
          >
            {children}
            <span aria-hidden="true" className="flex items-center gap-[5px]">
              <span className="tnum text-[12px]">80%</span>
              <BatteryCharging size={17} strokeWidth={1.8} />
            </span>
            <Wifi aria-hidden="true" size={15} strokeWidth={2} />
            <Search aria-hidden="true" size={14} strokeWidth={2.2} />
          </div>
        )}
      </Stage>
      <figcaption className="mt-3 text-[13px] leading-[1.45] text-ink-3">{caption}</figcaption>
    </figure>
  );
}
