import type { ReactNode } from "react";
import { CopyBloom } from "@/components/install/CopyBloom";
import { CopyCommand } from "@/components/install/CopyCommand";
import { MacAlert } from "@/components/install/MacAlert";
import { SecuritySettings } from "@/components/install/SecuritySettings";
import { type Spec, SpecList } from "@/components/install/SpecList";
import { pageMetadata } from "@/components/site/metadata";
import { SITE } from "@/components/site/nav";
import { Plane } from "@/components/site/Plane";
import { Eaves } from "@/components/site/Eaves";
import { Section } from "@/components/site/Section";
import { display, heading, heroTop, prose, textLink as link } from "@/components/site/type";
import { INSTALL_SCRIPT_LINES } from "@/lib/installScript";

export const metadata = pageMetadata({
  title: "Install",
  description: `curl -fsSL https://soffit.rtaapp.in/install.sh | bash — a ${INSTALL_SCRIPT_LINES}-line script you can read first. macOS 14.0 Sonoma or later, Apple silicon only, free, self-signed.`,
  path: "/install/",
});

const COMMAND = "curl -fsSL https://soffit.rtaapp.in/install.sh | bash";
const ZIP = `/downloads/Soffit-${SITE.version}.zip`;

const SPECS: readonly Spec[] = [
  { label: "Version", value: SITE.version, numeric: true },
  { label: "Price", value: "free" },
  { label: "Minimum", value: "macOS 14.0", numeric: true },
  { label: "Architecture", value: "arm64" },
  { label: "Signature", value: "self-signed" },
];


/** A string macOS shows, quoted in running text. */
function Q({ children }: { children: ReactNode }) {
  return <span className="text-ink">{children}</span>;
}

export default function InstallPage() {
  return (
    <>
      <Plane tone="top" pad="flush-top" aria-labelledby="install-title" className={heroTop}>
        <Eaves />
        <CopyBloom />
        <Section className="relative grid gap-y-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-16 lg:gap-y-12">
          <h1
            id="install-title"
            className={`${display} lg:self-end`}
          >
            Install.
          </h1>

          <SpecList specs={SPECS} className="order-last max-w-[440px] lg:order-none lg:max-w-none lg:self-end" />

          <CopyCommand
            command={COMMAND}
            breaks={["https://", "rtaapp.in"]}
            note="macOS 14.0 Sonoma or later, Apple silicon only."
            className="lg:col-span-2"
          />

          <div className="space-y-5 lg:col-span-2">
            <p className={prose}>
              The script is <span className="tnum">{INSTALL_SCRIPT_LINES}</span> lines.{" "}
              <a className={link} href="/install.sh">
                Read it first
              </a>{" "}
              if you’d rather. Or{" "}
              <a className={link} href={ZIP} download>
                download the zip
              </a>{" "}
              and do it yourself — that route goes through the dialog below.
            </p>
            <p className={prose}>
              There is no sudo in it: on an account that can’t write to /Applications it stops rather than asking.
            </p>
          </div>
        </Section>
      </Plane>

      <Plane tone="base" gap aria-labelledby="dialog-title">
        <Section className="space-y-5">
          <h2 id="dialog-title" className={heading}>
            The zip, by hand.
          </h2>
          <p className={prose}>
            Your browser sets the quarantine flag and curl doesn’t, and I haven’t paid Apple $99 a year to have Soffit
            checked. Same bytes, same server, different attribute.
          </p>
        </Section>

        <Section as="ol" className="mt-14 space-y-16 md:mt-20 md:space-y-20">
          <Step
            n={1}
            figure={
              <MacAlert
                title="“Soffit” Not Opened"
                message="Apple could not verify “Soffit” is free of malware that may harm your Mac or compromise your privacy."
                buttons={[{ label: "Move to Trash", primary: true }, { label: "Done" }]}
              />
            }
          >
            Double-click Soffit.app. There is no Open button, and right-click → Open stopped working in macOS 15.
          </Step>
          <Step n={2} figure={<SecuritySettings />}>
            Open System Settings, go to Privacy &amp; Security and scroll to Security. Open Anyway asks for Touch ID or
            your password, under <Q>You are attempting to open an app that may cause harm to your Mac or compromise your
            privacy</Q>.
          </Step>
          <Step
            n={3}
            figure={
              <MacAlert
                title="Open “Soffit”?"
                message="Apple is not able to verify that it is free from malware that could harm your Mac or compromise your privacy. Don’t open this unless you are certain it is from a trustworthy source."
                buttons={[{ label: "Cancel", primary: true }, { label: "Open Anyway" }]}
                icon="/assets/icon-128.png"
              />
            }
          >
            Then one last dialog. <Q>Open Anyway</Q>, or <Q>Cancel</Q>.
          </Step>
        </Section>
      </Plane>

      <Plane tone="deep" gap aria-labelledby="updates-title">
        <Section className="space-y-5">
          <h2 id="updates-title" className={heading}>
            Updates.
          </h2>
          <p className={prose}>
            To update, run the same line again. macOS ties the Accessibility grant to the exact build, so after an
            update pasting and the volume and brightness readout stop until you switch Soffit on again in System
            Settings, under Privacy &amp; Security.
          </p>
          <p className={prose}>
            The script copies Soffit.app to /Applications, quits any copy already running, and opens it. To get rid of
            it, choose <Q>Quit Soffit</Q> from its menu bar icon and drag Soffit.app to the Trash — it adds no login
            item unless you ask for one in Settings.
          </p>
        </Section>
      </Plane>
    </>
  );
}

/**
 * One stop on the browser route: the screen as macOS draws it, and a line
 * saying what to do there. Wide: drawing left, words right. Narrow: words
 * first, then the drawing, centred.
 */
function Step({ n, figure, children }: { n: number; figure: ReactNode; children: ReactNode }) {
  return (
    <li>
      <figure className="grid gap-6 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:items-center md:gap-10 lg:grid-cols-[500px_minmax(0,380px)] lg:gap-16">
        <div className="order-2 flex justify-center md:order-1">{figure}</div>
        <figcaption className="order-1 flex gap-4 md:order-2">
          <span aria-hidden="true" className="tnum pt-[3px] text-[13px] font-semibold text-ink-3 narrow">
            {n}
          </span>
          <span className="text-[15px] leading-[1.55] text-ink-2 sm:text-[16px]">{children}</span>
        </figcaption>
      </figure>
    </li>
  );
}
