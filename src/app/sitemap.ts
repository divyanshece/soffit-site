import type { MetadataRoute } from "next";
import { NAV, SITE } from "@/components/site/nav";

// Built once, to out/sitemap.xml. A static export needs the route marked static.
export const dynamic = "force-static";

/** Fixed so a rebuild does not churn every date. Bump on release. */
const RELEASED = new Date("2026-09-23");

export default function sitemap(): MetadataRoute.Sitemap {
  return NAV.map((item) => ({
    url: new URL(item.href, SITE.url).toString(),
    lastModified: RELEASED,
    changeFrequency: "monthly",
    priority: item.href === "/" ? 1 : 0.7,
  }));
}
