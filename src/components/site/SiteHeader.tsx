import Link from "next/link";
import { ViewTransition } from "react";
import { NavLinks } from "./NavLinks";
import { SITE } from "./nav";

/**
 * The fascia: the thin black band along the top of every page, the same black
 * as the notch that hangs off it.
 *
 *   ≥ 640px  one 34px row   Soffit. A quiet status layer…            Home Features Install About
 *   < 640px  34px + 22px    Soffit.                                  Home Features Install About
 *                           A quiet status layer for the top edge of your Mac.
 *
 * The four links fit in a row at 360px, so there is no menu to open. Its height
 * is published as `--fascia-h` (set on <body> in the root layout) so a page can
 * hang a notch exactly off its lower edge: `top-(--fascia-h)`.
 *
 * The header carries a view-transition name, so across a navigation it holds
 * still while the planes below it cross-fade.
 */
export function SiteHeader() {
  return (
    <ViewTransition name="soffit-fascia">
      <header className="relative z-30 h-(--fascia-h) bg-fascia">
        <a
          href="#main"
          className="absolute top-0 left-0 z-40 -translate-y-[120%] bg-fascia px-4 py-2 text-[12px] font-semibold text-ink focus-visible:translate-y-0"
        >
          Skip to the content
        </a>
        <div className="mx-auto grid h-full max-w-[1920px] grid-cols-[auto_minmax(0,1fr)] grid-rows-[34px_22px] items-stretch px-[9px] [grid-template-areas:'mark_nav'_'tag_tag'] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-rows-[34px] sm:px-[14px] sm:[grid-template-areas:'mark_tag_nav'] lg:px-[22px]">
          <Link
            href="/"
            className="flex items-center self-center px-[7px] py-2 text-[13px] leading-none font-semibold text-ink [font-stretch:62%] [grid-area:mark] sm:px-[8px]"
          >
            {SITE.name}.
          </Link>
          <p className="truncate px-[7px] text-[12px] leading-none font-semibold text-ink-3 [font-stretch:62%] [grid-area:tag] sm:self-center sm:px-0 sm:text-[13px]">
            {SITE.tagline}
          </p>
          <nav aria-label="Pages" className="justify-self-end [grid-area:nav]">
            <NavLinks variant="fascia" />
          </nav>
        </div>
      </header>
    </ViewTransition>
  );
}
