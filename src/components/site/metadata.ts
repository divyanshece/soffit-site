import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE } from "./nav";

/**
 * Per-page metadata in one call. Next merges `openGraph` and `twitter`
 * shallowly — a page that sets its own `openGraph` replaces the root one
 * wholesale — so pages should build theirs here rather than by hand:
 *
 *   export const metadata = pageMetadata({
 *     title: "Install",
 *     description: "One line in Terminal. macOS 14 or later, Apple silicon.",
 *     path: "/install/",
 *   });
 *
 * The share image is src/app/opengraph-image.png (and twitter-image.png). Next
 * only attaches those by file convention to a page that does not declare its
 * own `openGraph`, so a page built here names them: without this every page but
 * the homepage shared as a bare link.
 */
const ALT = readFileSync(join(process.cwd(), "src/app/opengraph-image.alt.txt"), "utf8").trim();

const SHARE = { width: 1200, height: 630, type: "image/png", alt: ALT } as const;

export function pageMetadata({
  title,
  description,
  path,
}: {
  /** The page's own name; the root template turns it into "Install — Soffit". */
  title: string;
  description: string;
  /** Route with its trailing slash, e.g. "/install/". Becomes the canonical URL. */
  path: `/${string}`;
}): Metadata {
  const full = `${title} — ${SITE.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: "en_GB",
      url: path,
      title: full,
      description,
      images: [{ url: "/opengraph-image.png", ...SHARE }],
    },
    twitter: {
      card: "summary_large_image",
      title: full,
      description,
      images: [{ url: "/twitter-image.png", ...SHARE }],
    },
  };
}
