import clsx from "clsx";
import type { ReactNode } from "react";
import { Plane, type PlaneTone } from "@/components/site/Plane";
import { Section } from "@/components/site/Section";
import { heading, prose } from "@/components/site/type";
import { Dim } from "./Dim";

export interface FeatureCopy {
  /** the section's anchor, also used for its heading id */
  id: string;
  /** the feature's name */
  title: string;
  /** one sentence, from the copy */
  line: string;
  /** its one number, as a dimension annotation — only where the figure is the point */
  dim?: { label: string; value: string };
}

/**
 * One feature, on its own plane. The redrawn surface is the content; the name,
 * a sentence and one measured number sit beside it.
 *
 *   sheet       the name above, the drawing full width, then the sentence on
 *               the left and the number hanging off the right: a drawing sheet
 *   text-left   from lg, the words in a narrow column left of the drawing
 *   text-right  the same, mirrored
 *
 * Below lg every layout is one column: name, sentence, drawing, number.
 *
 * `wide` lets a sheet run to the 1440px cap: the page's one set piece.
 */
export function Feature({
  copy,
  layout = "sheet",
  tone = "base",
  gap = false,
  wide = false,
  children,
}: {
  copy: FeatureCopy;
  layout?: "sheet" | "text-left" | "text-right";
  tone?: PlaneTone;
  gap?: boolean;
  /** sheet only: run the drawing to the wide cap */
  wide?: boolean;
  /** the live surface */
  children: ReactNode;
}) {
  const titleId = `${copy.id}-title`;

  if (layout === "sheet") {
    return (
      <Plane id={copy.id} aria-labelledby={titleId} tone={tone} gap={gap}>
        {/* Words stay on the page's axis; only a wide sheet's drawing runs past it. */}
        <Section>
          <Title id={titleId}>{copy.title}</Title>
        </Section>
        <Section width={wide ? "wide" : "default"} className="mt-6 md:mt-8">
          {children}
        </Section>
        <Section>
          <div className="mt-6 grid gap-5 md:mt-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline md:gap-12">
            <Line>{copy.line}</Line>
            {copy.dim && <Dim {...copy.dim} align="end" />}
          </div>
        </Section>
      </Plane>
    );
  }

  return (
    <Plane id={copy.id} aria-labelledby={titleId} tone={tone} gap={gap}>
      <Section
        className={clsx(
          "grid gap-y-6 md:gap-y-8 lg:items-center lg:gap-x-16 xl:gap-x-24",
          layout === "text-left"
            ? "lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]"
            : "lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]",
        )}
      >
        <div className={clsx(layout === "text-right" && "lg:order-2")}>
          <Title id={titleId}>{copy.title}</Title>
          <Line className="mt-4">{copy.line}</Line>
          {copy.dim && <Dim {...copy.dim} className="mt-6 hidden lg:flex" />}
        </div>
        <div className={clsx(layout === "text-right" && "lg:order-1")}>{children}</div>
        {/* below lg the number follows the drawing it measures */}
        {copy.dim && <Dim {...copy.dim} className="lg:hidden" />}
      </Section>
    </Plane>
  );
}

export function Title({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2
      id={id}
      className={clsx(
        heading,
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Line({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx(prose, "max-w-[40ch]", className)}>{children}</p>;
}
