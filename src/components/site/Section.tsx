import clsx from "clsx";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

/**
 * The content container every page shares: centred, capped, with the site's
 * gutters. Gutters are 20px at 360, 32 from 640, 48 from 1024 and 64 from
 * 1536; the cap applies to the content box, so the gutter is never eaten by
 * the max-width at any size.
 *
 *   width  content cap   for
 *   text      640px      a column of prose, left edge on the page's axis
 *   narrow    880px      a figure with a caption, a form, a short list
 *   default  1200px      most sections
 *   wide     1440px      the big redrawn Mac stages
 *   full      none       gutters only
 */
const WIDTH = {
  text: "max-w-[640px]",
  narrow: "max-w-[880px]",
  default: "max-w-[1200px]",
  wide: "max-w-[1440px]",
  full: "",
} as const;

export type SectionWidth = keyof typeof WIDTH;

export type SectionProps<T extends ElementType = "div"> = {
  /** Content cap. Default "default" (1200px). */
  width?: SectionWidth;
  /** Element rendered. Default "div". */
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Section<T extends ElementType = "div">({
  width = "default",
  as,
  className,
  children,
  ...rest
}: SectionProps<T>) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      className={clsx(
        "mx-auto box-content px-5 sm:px-8 lg:px-12 2xl:px-16",
        WIDTH[width],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
