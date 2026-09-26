import type { NextConfig } from "next";

// Every page is still prerendered to static HTML, and `public/install.sh`,
// `appcast.json` and `files/` stay raw files. The one thing that is not static
// is `/downloads/<zip>`: a route that counts the download privately and then
// redirects to `/files/<zip>` (see src/app/downloads/[file]/route.ts). That is
// why this is no longer `output: "export"`, which cannot run a route.
// Never add a catch-all rewrite to index.html: it would pipe the homepage into
// bash for anyone running the install one-liner.
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // The benches under src/app/lab exist to check each redrawn surface in
  // isolation. They are named page.dev.tsx, so only `next dev` treats them as
  // routes: a production export contains the four real pages and nothing else.
  pageExtensions: isDev ? ["tsx", "ts", "dev.tsx"] : ["tsx", "ts"],
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
