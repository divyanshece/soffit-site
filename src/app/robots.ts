import type { MetadataRoute } from "next";
import { SITE } from "@/components/site/nav";

// Built once, to out/robots.txt.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // The benches are stripped from a production build by pageExtensions,
    // so there is nothing to disallow — and naming them would publish the path.
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
