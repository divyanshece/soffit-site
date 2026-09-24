import type { NextConfig } from "next";

// Static export: every route builds to a real `route/index.html`, so any plain
// static host serves it — and `public/install.sh`, `appcast.json` and
// `downloads/` stay raw files. A client-routed SPA would need a catch-all
// rewrite to index.html, and that rewrite would pipe the homepage into bash
// for anyone running the install one-liner.
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "export",
  // The benches under src/app/lab exist to check each redrawn surface in
  // isolation. They are named page.dev.tsx, so only `next dev` treats them as
  // routes: a production export contains the four real pages and nothing else.
  pageExtensions: isDev ? ["tsx", "ts", "dev.tsx"] : ["tsx", "ts"],
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
