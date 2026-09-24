import type { Metadata } from "next";
import Link from "next/link";
import { Eaves } from "@/components/site/Eaves";
import { Plane } from "@/components/site/Plane";
import { Section } from "@/components/site/Section";
import { display, heroTop, lede, textLink } from "@/components/site/type";

/**
 * The page that is not there. Next's own 404 has no fascia, no planes and no
 * light, so a mistyped URL used to land somewhere that did not look like the
 * site at all; this is one plane, one line and the way back.
 *
 * Nothing moves: the Eaves are the static light every page but the home page
 * uses, and there is no drawing to load.
 */
// Without this the 404 inherits the root layout's title, so a mistyped URL
// gets a tab — and a bookmark — reading "Soffit. A quiet status layer…".
export const metadata: Metadata = {
  title: "Nothing here",
  description: "That page doesn’t exist.",
};

export default function NotFound() {
  return (
    <Plane tone="top" pad="flush-top" aria-labelledby="notfound-title" className={heroTop}>
      <Eaves intensity={0.3} />
      <Section className="relative pb-6">
        <h1 id="notfound-title" className={display}>
          Nothing here.
        </h1>
        <p className={`mt-7 max-w-[34ch] text-ink-2 ${lede}`}>
          That page doesn’t exist.{" "}
          <Link href="/" className={textLink}>
            Start again
          </Link>
          .
        </p>
      </Section>
    </Plane>
  );
}
