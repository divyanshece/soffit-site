# web/ — soffit.rtaapp.in

The Soffit site, rebuilt in Next.js 16 (App Router), React 19, Tailwind CSS v4 and TypeScript,
with `motion` for animation. The app is redrawn in code rather than shown as video. The site is
exported as plain static files.

`../site/` is the old hand-written version. It is kept as the visual reference and is not deployed
from here.

## Run it

```sh
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # type-check
npm run build        # static export to out/
```

Next 16 differs from older versions. Before writing routing, metadata, font, image or
view-transition code, read the guide for it in `node_modules/next/dist/docs/` (see `AGENTS.md`).

## Layout

```
src/
  app/
    layout.tsx              <html>, metadata, the header, <main id="main">, the footer
    globals.css             the design tokens (Tailwind @theme): planes, ink, light, surface
    page.tsx                Home
    <slug>/page.tsx         one folder per page
    sitemap.ts, robots.ts   built from the nav, to out/sitemap.xml and out/robots.txt
    opengraph-image.png     the share image (+ twitter-image.png, and .alt.txt for each)
    favicon.ico
    lab/                    a test bench for the notch. It is not linked and robots.txt disallows it.
  components/
    site/                   the shell and the page rhythm
      nav.ts                the navigation as data, plus SITE (name, tagline, url, version)
      metadata.ts           pageMetadata() for per-page title, description, canonical, og
      SiteHeader.tsx        the fascia: the black band along the top
      SiteFooter.tsx        the dictionary line, the pages again, the rights
      NavLinks.tsx          the links, with aria-current (the shell's one client island)
      Plane.tsx             <Plane> a full-bleed section band, and <ShadowGap> the one divider
      Section.tsx           <Section> the content container: max width and gutters
      Spill.tsx             the light from under the notch's lip
    notch/                  the notch, its silhouette, the menu bar, the Mac-screen stage
    surfaces/               what shows inside the open notch (Glance, …)
  lib/                      notch geometry, hover intent, fit-to-width scaling
public/                     copied to the web root as-is (see below)
```

## Add a page

1. Add one line to `NAV` in `src/components/site/nav.ts`, e.g. `{ href: "/feedback/", label: "Feedback" }`.
   The header, the footer and the sitemap all pick it up. Hrefs end in `/`.
2. Create `src/app/feedback/page.tsx`. Keep it a server component and put the interactive parts
   in client components:

```tsx
import { Plane } from "@/components/site/Plane";
import { Section } from "@/components/site/Section";
import { pageMetadata } from "@/components/site/metadata";

export const metadata = pageMetadata({
  title: "Feedback",
  description: "What people have said about Soffit.",
  path: "/feedback/",
});

export default function Page() {
  return (
    <Plane tone="mid" aria-labelledby="feedback-title">
      <Section width="text">
        <h1 id="feedback-title">Feedback</h1>
      </Section>
    </Plane>
  );
}
```

The layout already provides `<main>`, so a page must not render another. Planes should get darker
as the page goes down: `top` for a hero, then `mid`, `base`, `deep`. The footer is `deep`, below a
shadow gap.

## Public files

`public/` is copied into `out/` unchanged, at the same paths:

```
/install.sh                    the target of  curl -fsSL https://soffit.rtaapp.in/install.sh | bash
/appcast.json                  what the app's updater fetches
/downloads/Soffit-<v>.zip      the release zips
/assets/icon-*.png             the app icon at 32, 128, 180, 256, 512 and 1024
```

To ship a new release, put the zip in `public/downloads/`, update the version in `appcast.json`
and `install.sh` (and in `SITE.version` in `nav.ts`), then rebuild.

## Deploy

`next.config.ts` sets `output: "export"` and `trailingSlash: true`. `npm run build` writes a
complete static site to `out/`, where every route is a real `route/index.html`.

To deploy to soffit.rtaapp.in, upload the contents of `out/` to the web root of any static host.
Nothing else is needed. The host should:

- serve `index.html` for a directory request, which is the default nearly everywhere;
- serve `404.html` for a missing path, if the host allows a custom 404;
- **NOT** rewrite unknown paths or all paths to `/index.html`. There must be no SPA fallback or
  catch-all rewrite. With one, a typo or a missing `install.sh` would return the homepage's HTML
  with a 200 status, and `curl … | bash` would pipe that HTML into bash. `install.sh`,
  `appcast.json` and `downloads/` must be served as the raw files they are.

To check a build before uploading it:

```sh
npm run build
cmp out/install.sh public/install.sh && cmp out/appcast.json public/appcast.json \
  && cmp out/downloads/Soffit-0.1.0.zip public/downloads/Soffit-0.1.0.zip && echo ok
npx serve out   # any static server
```
