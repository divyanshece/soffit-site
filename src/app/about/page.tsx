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
              {SITE.author} built it, because macOS draws a large panel in the middle of your screen to tell you the
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
          </ul>
        </Section>
      </Plane>
    </>
  );
}
