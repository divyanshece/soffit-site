import Link from "next/link";
import { Dim } from "@/components/features/Dim";
import { EyesDemo } from "@/components/features/EyesDemo";
import { Feature, type FeatureCopy, Line, Title } from "@/components/features/Feature";
import { FeaturesHero } from "@/components/features/FeaturesHero";
import { ShelfDemo } from "@/components/features/ShelfDemo";
import { ClipboardDemo, GlanceDemo, NowPlayingDemo, TimersDemo } from "@/components/features/SurfaceDemos";
import { LevelsDemo, PowerDemo } from "@/components/features/SystemDemos";
import { pageMetadata } from "@/components/site/metadata";
import { SurfaceNav } from "@/components/surfaces/ExpandedShell";
import { Plane } from "@/components/site/Plane";
import { Section } from "@/components/site/Section";
import { display, heroTop, lede, textLink } from "@/components/site/type";

export const metadata = pageMetadata({
  title: "Features",
  description:
    "Clipboard history, timers, now playing, a shelf for files, volume and brightness, battery warnings, the time at a glance, and googly eyes. One surface, one thing at a time.",
  path: "/features/",
});

// Every sentence and every number here is from the copy (site/features.html)
// or the Swift source. Nothing is added to it. A dimension line appears only
// where the figure is the point of the feature.
const COPY = {
  clipboard: {
    id: "clipboard",
    title: "Clipboard",
    line: "Kept in memory only.",
    dim: { label: "History", value: "100 items" },
  },
  timers: {
    id: "timers",
    title: "Timers",
    line: "A stopwatch with laps, and a countdown.",
    dim: { label: "Focus blocks", value: "25 / 5 / 15 × 4" },
  },
  nowPlaying: {
    id: "now-playing",
    title: "Now playing",
    line: "A scrubber you can drag.",
  },
  shelf: {
    id: "shelf",
    title: "Shelf",
    line: "Drag files onto the notch and they wait there. It holds a reference, never a copy.",
    dim: { label: "Shelf", value: "24 tiles" },
  },
  levels: {
    id: "levels",
    title: "Volume and brightness",
    line: "Volume and brightness in the notch, instead of the panel in the middle of your screen.",
    dim: { label: "Steps", value: "16" },
  },
  battery: {
    id: "battery",
    title: "Battery",
    line: "A warning before the battery runs out, and again, and again.",
    dim: { label: "Warns at", value: "20 / 10 / 5%" },
  },
  status: {
    id: "status",
    title: "Status",
    line: "The time, the date, the battery and the volume, for when nothing else is happening.",
  },
  eyes: {
    id: "eyes",
    title: "Eyes",
    line: "Googly eyes in the menu bar, if you like.",
  },
} satisfies Record<string, FeatureCopy>;

/**
 * The tab bar in every surface's ears, made real: each glyph goes to the
 * section that draws that surface, the way it goes to that surface in the app.
 * Settings has nothing to point at here, so that glyph stays a drawing.
 */
const SURFACES = {
  clipboard: "#clipboard",
  timer: "#timers",
  music: "#now-playing",
  shelf: "#shelf",
  status: "#status",
} as const;

export default function FeaturesPage() {
  return (
    <SurfaceNav to={SURFACES}>
      {/* The notch hangs off the fascia; the page's index opens in its ears. */}
      <Plane tone="top" pad="flush-top" aria-labelledby="features-title">
        <FeaturesHero />
        <Section className={heroTop}>
          <h1
            id="features-title"
            className={`max-w-[16ch] ${display}`}
          >
            One surface. One thing at a time.
          </h1>
        </Section>
      </Plane>

      <Feature copy={COPY.clipboard} tone="mid" wide>
        <ClipboardDemo />
      </Feature>

      <Feature copy={COPY.timers} tone="base" gap>
        <TimersDemo />
      </Feature>

      <Feature copy={COPY.nowPlaying} layout="text-left" tone="mid">
        <NowPlayingDemo />
      </Feature>

      <Feature copy={COPY.shelf} tone="base" gap>
        <ShelfDemo />
      </Feature>

      {/* The two readouts that drop out of the closed notch and go back: a pair,
          on one plane, each with its own controls. */}
      <Plane tone="deep" aria-label="Volume, brightness and battery">
        <Section className="grid gap-16 lg:grid-cols-2 lg:gap-x-16 xl:gap-x-24">
          <SystemFeature copy={COPY.levels}>
            <LevelsDemo />
          </SystemFeature>
          <SystemFeature copy={COPY.battery}>
            <PowerDemo />
          </SystemFeature>
        </Section>
      </Plane>

      <Feature copy={COPY.status} layout="text-right" tone="mid" gap>
        <GlanceDemo />
      </Feature>

      <Feature copy={COPY.eyes} layout="text-left" tone="deep">
        <EyesDemo />
      </Feature>

      <Plane tone="base" gap aria-label="Permissions">
        <Section>
          <p className={`max-w-[46ch] text-ink ${lede}`}>
            Two things need Accessibility: replacing macOS’s volume and brightness panel, and pressing ⌘V for you.
            Now playing asks once to talk to Music and Spotify. Nothing else asks for anything.
          </p>
          <p className="mt-8">
            <Link
              href="/install/"
              className={`inline-flex min-h-11 items-center text-[17px] ${textLink}`}
            >
              How to install it
            </Link>
          </p>
        </Section>
      </Plane>
    </SurfaceNav>
  );
}

/** One of the pair on the deep plane: its own heading, sentence, drawing and number. */
function SystemFeature({ copy, children }: { copy: FeatureCopy; children: React.ReactNode }) {
  const titleId = `${copy.id}-title`;
  return (
    <section id={copy.id} aria-labelledby={titleId} className="scroll-mt-6">
      <Title id={titleId}>{copy.title}</Title>
      <Line className="mt-4">{copy.line}</Line>
      <div className="mt-6 md:mt-8">{children}</div>
      {copy.dim && <Dim {...copy.dim} className="mt-6" />}
    </section>
  );
}
