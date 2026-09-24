/**
 * The site's type scale and the few recurring text settings, as class strings,
 * so every page sets its heading, sentence, caption and annotation the same way.
 * Pages add layout (margins, max-widths, colour where it differs) on top.
 *
 *   statement   the home page's h1 — the site's one large typographic moment
 *   display     every other page's h1
 *   heading     every h2 — a plane's or a feature's title
 *   lede        the sentence that follows a display heading
 *   prose       running text
 *   caption     a line under a drawing
 *   annotation  dimension lines, spec lists, the notes inside a command well
 *   textLink    an underlined link inside text
 */
export const statement =
  "wider text-[clamp(40px,min(6.2vw,11vh),96px)] leading-[1.0] font-semibold tracking-[-0.022em] text-balance text-ink";

export const display =
  "wide text-[40px] leading-[1.04] font-semibold tracking-[-0.018em] text-balance text-ink sm:text-[52px] lg:text-[58px]";

export const heading =
  "wide text-[24px] leading-[1.1] font-semibold tracking-[-0.01em] text-balance text-ink md:text-[28px]";

export const lede = "text-[18px] leading-[1.5] text-pretty sm:text-[21px]";

export const prose = "max-w-[62ch] text-[16px] leading-[1.6] text-pretty text-ink-2 sm:text-[17px]";

export const caption = "text-[13px] leading-[1.45] text-ink-3";

export const annotation = "narrow text-[12px] leading-[1.3] font-medium tracking-[0.04em]";

export const textLink =
  "text-ink underline decoration-leader decoration-1 underline-offset-[0.3em] transition-[text-decoration-color] duration-150 hover:decoration-ink";

/** Top padding for a page's first plane when a collapsed notch hangs over it. */
export const heroTop = "pt-[132px] sm:pt-[148px] lg:pt-[168px]";
