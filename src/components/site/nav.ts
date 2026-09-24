/**
 * The site's navigation, as data. The header and the footer both read this, and
 * so do the sitemap and the current-page marker. Adding a page is one line here
 * plus its `src/app/<slug>/page.tsx`.
 *
 * Hrefs end in a slash: the site is a static export with `trailingSlash: true`,
 * so every route is a real `<slug>/index.html` on disk.
 */
export interface NavItem {
  href: `/${string}`;
  label: string;
}

export const NAV: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/features/", label: "Features" },
  { href: "/install/", label: "Install" },
  { href: "/about/", label: "About" },
];

export const SITE = {
  name: "Soffit",
  url: "https://soffit.rtaapp.in",
  tagline: "A quiet status layer for the top edge of your Mac.",
  description:
    "Soffit lives in the notch on your Mac. Rest the pointer on it and it opens; move away and it is gone again. macOS 14.0 Sonoma or later, Apple silicon only.",
  version: "0.1.0",
  author: "Divyansh Pandey",
  year: 2026,
} as const;

/** `/features` and `/features/` are the same page; compare without the slash. */
const trim = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

export function isCurrent(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  return trim(href) === trim(pathname);
}
