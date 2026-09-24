import { SpillStatic } from "@/components/site/SpillStatic";
import { NOTCH, notchPath, outerWidth } from "@/lib/notch";

/**
 * The collapsed notch hanging off the fascia, at its real 179 × 32, with the
 * light at rest under its lip. Put it first inside a full-bleed <Plane> that
 * starts right under the header; nothing here animates.
 *
 * The SVG may take a transform (it is a sibling of the Spill, not its
 * ancestor); the Spill and the plane above it must not. The light is the
 * static Spill, so pages that only hang the notch ship no animation runtime.
 */
export function Eaves({ intensity = 0.42 }: { intensity?: number }) {
  const box = NOTCH.collapsed;
  const w = outerWidth(box);
  return (
    <>
      <svg
        aria-hidden="true"
        width={w}
        height={box.height}
        viewBox={`0 0 ${w} ${box.height}`}
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
      >
        <path d={notchPath(w, box.height, box.top, box.bottom)} fill="var(--color-surface)" />
      </svg>
      <SpillStatic top={box.height} width={box.width} radius={box.bottom} intensity={intensity} />
    </>
  );
}
