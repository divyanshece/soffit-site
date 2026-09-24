import { NavLinks } from "./NavLinks";
import { SITE } from "./nav";
import { ShadowGap } from "./Plane";
import { Section } from "./Section";

/**
 * The foot of every page: the dictionary line, the pages again, and the rights.
 * The deepest plane on the site, under the one divider it allows.
 */
export function SiteFooter() {
  return (
    <footer className="bg-plane-deep">
      <ShadowGap />
      <Section
        width="wide"
        className="grid gap-x-12 gap-y-4 py-10 text-[13px] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:py-12"
      >
        <p className="font-medium text-ink-3">
          <em>soffit</em>, n. — the finished underside of an overhang.
        </p>
        <p className="font-medium text-ink-3 tnum max-sm:order-last sm:text-right">
          © {SITE.year} {SITE.author}.
        </p>
        <nav aria-label="Pages, again" className="-ml-px sm:col-span-2">
          <NavLinks variant="foot" />
        </nav>
      </Section>
    </footer>
  );
}
