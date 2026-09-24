import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HeroStage } from "@/components/home/HeroStage";
import { InstallLine } from "@/components/home/InstallLine";
import { pageMetadata } from "@/components/site/metadata";
import { SITE } from "@/components/site/nav";
import { Plane } from "@/components/site/Plane";
import { Section } from "@/components/site/Section";
import { heading, lede, prose, statement, textLink } from "@/components/site/type";
import { INSTALL_SCRIPT_LINES } from "@/lib/installScript";

const TITLE = `${SITE.name}. ${SITE.tagline}`;
const DESCRIPTION =
  "Soffit lives in the notch on your Mac. Rest the pointer on it and it opens; move away and it is gone again. macOS 14.0 Sonoma or later, Apple silicon only.";

const base = pageMetadata({ title: SITE.name, description: DESCRIPTION, path: "/" });
export const metadata: Metadata = {
  ...base,
  // Home keeps the full name as its title rather than "Soffit — Soffit".
  title: { absolute: TITLE },
  openGraph: { ...base.openGraph, title: TITLE },
  twitter: { ...base.twitter, title: TITLE },
};

// Two links, plain underlines. The underline colour is inherited from --dec,
// which the hero lifts towards lip light as the notch opens; hover sets --dec
// on the link itself, so it still wins. The 44pt target is keyed on the
// pointer, not the viewport: a tablet is coarse at any width.
const link =
  "inline-flex min-h-11 items-center underline decoration-1 underline-offset-[0.3em] [text-decoration-color:var(--dec,var(--color-leader))] transition-[text-decoration-color] duration-150 hover:[--dec:var(--color-ink)] [@media(pointer:fine)]:min-h-0";

/** The links' underline, lifted by --lit. Light, so it lags the shape a little. */
const DEC = {
  "--dec": "color-mix(in oklab, var(--color-leader), var(--color-lip) calc(var(--lit, 0) * 55%))",
} as CSSProperties;

export default function Home() {
  return (
    <>
      <Plane tone="top" pad="flush-top" aria-labelledby="hero-title">
        <HeroStage>
          <Section className="pt-6 sm:pt-8 lg:pt-10">
            {/* Pointer devices get the instruction; touch gets the one thing a
                finger can do here. display:none hides the other from AT too.
                The gesture is the app's own: the notch opens when the pointer
                RESTS on it, so that is what the page says. */}
            <h1
              id="hero-title"
              className={`max-w-[15ch] ${statement}`}
              style={{
                textShadow: [
                  "0 1px 0 rgb(255 199 133 / calc(0.10 + 0.24 * var(--lit, 0)))",
                  "0 2px 8px rgb(252 115 56 / calc(0.04 + 0.10 * var(--lit, 0)))",
                  "0 6px 30px rgb(252 115 56 / calc(0.10 * var(--lit, 0)))",
                ].join(", "),
              }}
            >
              <span className="[@media(hover:none)]:hidden">Rest the pointer on the notch.</span>
              <span className="hidden [@media(hover:none)]:inline">Tap the notch.</span>
            </h1>
            <p className={`mt-5 max-w-[46ch] text-ink-2 sm:mt-6 ${lede}`}>
              <span className="[@media(hover:none)]:hidden">It opens. Move away and it’s gone again.</span>
              <span className="hidden [@media(hover:none)]:inline">
                On a Mac it’s the pointer: rest it on the notch and it opens. Move away and it’s gone again.
              </span>
            </p>
            {/* stacked on a phone the two 44pt targets would meet edge to edge, so the
                column keeps a gap the row does not need */}
            <p className="mt-6 flex flex-col gap-y-2 text-[17px] sm:mt-8 sm:flex-row sm:gap-8" style={DEC}>
              <Link href="/install/" className={`${link} text-ink`}>
                Install
              </Link>
              <Link href="/features/" className={`${link} text-ink-2`}>
                What it does
              </Link>
            </p>
          </Section>
        </HeroStage>
      </Plane>

      <Plane tone="mid" gap aria-labelledby="install-title">
        <Section className="grid gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:gap-x-12">
          <div>
            <h2 id="install-title" className={heading}>
              Install.
            </h2>
          </div>
          <div>
            <InstallLine />
            <p className={`mt-5 ${prose}`}>
              <span className="tnum">{INSTALL_SCRIPT_LINES}</span> lines.{" "}
              <a href="/install.sh" className={textLink}>
                Read it first
              </a>{" "}
              if you’d rather.
            </p>
          </div>
        </Section>
      </Plane>
    </>
  );
}
