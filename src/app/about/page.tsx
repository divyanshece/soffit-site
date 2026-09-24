import { DrowsyEyes } from "@/components/about/DrowsyEyes";
import { Dimensions } from "@/components/about/Dimensions";
import { Plane } from "@/components/site/Plane";
import { Section } from "@/components/site/Section";
import { Eaves } from "@/components/site/Eaves";
import { pageMetadata } from "@/components/site/metadata";
import { SITE } from "@/components/site/nav";
import { caption, display, heading, heroTop, lede, prose } from "@/components/site/type";

export const metadata = pageMetadata({
  title: "About",
  description: `Built by ${SITE.author}. Version ${SITE.version}, early. Free, © ${SITE.year}.`,
  path: "/about/",
});

const EMAIL = "divyanshece242@gmail.com";

// Profiles, each with its brand mark (GitHub's Octicon, LinkedIn's "in"), drawn in the text colour.
const PROFILES = [
  { label: "GitHub", href: "https://github.com/divyanshece", viewBox: "0 0 16 16", d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/divyanshece/", viewBox: "0 0 24 24", d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
] as const;

const FACTS = [
  { label: "Version", value: SITE.version },
  { label: "Status", value: "early" },
  { label: "Price", value: "free" },
] as const;

// These are standalone links in a list, not words inside a sentence, so they
// keep a 44pt target wherever the pointer is a finger — keyed on the pointer,
// not on the viewport width, or a tablet at 834 loses it.
const LINK =
  "inline-flex min-h-11 items-center text-ink underline decoration-leader decoration-1 underline-offset-[0.3em] transition-colors duration-150 hover:decoration-ink [@media(pointer:fine)]:min-h-0";

export default function AboutPage() {
  return (
    <>
      <Plane tone="top" pad="flush-top" aria-labelledby="about-title" className={heroTop}>
        <Eaves intensity={0.3} />
        <Section className="relative grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h1 id="about-title" className={display}>
              About.
            </h1>
            <p className={`mt-7 max-w-[34ch] text-ink ${lede}`}>
              Built because macOS draws a large panel in the middle of your screen to tell you the
              volume changed, and there was a black rectangle at the top of it doing nothing.
            </p>
            <Dimensions items={FACTS} className="mt-10" />
          </div>

          <figure className="flex flex-col items-start lg:items-center">
            <DrowsyEyes className="py-2" />
            <figcaption className={`mt-6 max-w-[30ch] lg:text-center ${caption}`}>
              Left alone, the lids come down. The app waits two and a half minutes of stillness; this page waits less.
            </figcaption>
          </figure>
        </Section>
      </Plane>

      <Plane tone="base" gap aria-labelledby="site-title">
        <Section className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 id="site-title" className={heading}>
              This site.
            </h2>
            <p className={`mt-5 ${prose}`}>
              Static files, no analytics. Leave the page alone and the eyes fall asleep, and after that nothing on it
              runs. You can check.
            </p>
          </div>
          <ul className="flex flex-col gap-x-8 gap-y-1 text-[15px] sm:flex-row sm:flex-wrap sm:gap-y-3 lg:flex-col lg:self-end">
            <li>
              <a className={LINK} href="/install.sh">
                The install script
              </a>
            </li>
            <li>
              <a className={LINK} href={`/downloads/Soffit-${SITE.version}.zip`}>
                Soffit-{SITE.version}.zip
              </a>
            </li>
            <li>
              <a className={LINK} href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>
            </li>
            {PROFILES.map((p) => (
              <li key={p.label}>
                <a className={`${LINK} gap-2`} href={p.href} target="_blank" rel="me noopener noreferrer">
                  <svg aria-hidden="true" viewBox={p.viewBox} className="size-[1em] shrink-0 fill-current">
                    <path d={p.d} />
                  </svg>
                  {p.label}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </Plane>
    </>
  );
}
