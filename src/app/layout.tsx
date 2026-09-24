import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE } from "@/components/site/nav";
import "./globals.css";

// Archivo, variable, with its width axis: the display face runs wide.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const TITLE = `${SITE.name}. ${SITE.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: `%s — ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.author }],
  creator: SITE.author,
  // No canonical or og:url here: the root layout's values are inherited by
  // every page that does not set its own, and a site-wide canonical of "/"
  // would tell search engines every page is the homepage. Pages set theirs
  // with pageMetadata() from components/site/metadata.
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_GB",
    title: TITLE,
    description: "Rest the pointer on the notch and it opens. Move away and it is gone again.",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: "Rest the pointer on the notch and it opens. Move away and it is gone again.",
  },
  // favicon.ico is picked up from src/app by file convention; these add the
  // sizes a browser or a phone's home screen asks for.
  icons: {
    icon: [
      { url: "/assets/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/icon-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: [{ url: "/assets/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

// Next 16 wants theme colour and colour scheme here, not in `metadata`.
// The value is the base plane (--color-plane), the colour behind the page.
export const viewport: Viewport = {
  themeColor: "#0f1116",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={archivo.variable}>
      {/* --fascia-h is the header's height at each width, published so a page
          can hang its notch off the fascia's lower edge: top-(--fascia-h). */}
      <body className="flex min-h-dvh flex-col bg-plane text-ink [--fascia-h:56px] sm:[--fascia-h:34px]">
        <SiteHeader />
        {/* The skip link lands here. It takes focus, so it has to show it. */}
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lip"
        >
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
