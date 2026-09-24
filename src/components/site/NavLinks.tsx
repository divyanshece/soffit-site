"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { isCurrent, NAV } from "./nav";

/**
 * The page links, marked with aria-current on the page you are on. The one
 * client island in the shell: it needs the pathname and nothing else.
 *
 * `fascia` — the header row. The current page gets a 1px ink tick along the
 *   fascia's bottom edge; the tick has a view-transition name, so on
 *   navigation it slides from the old link to the new one while the bar
 *   itself holds still.
 * `foot`   — the footer's repeat: plain, quiet, wraps.
 */
export function NavLinks({ variant }: { variant: "fascia" | "foot" }) {
  const pathname = usePathname();

  if (variant === "foot") {
    return (
      <ul className="flex flex-wrap gap-x-6 gap-y-1">
        {NAV.map((item) => {
          const current = isCurrent(item.href, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={clsx(
                  "inline-flex min-h-11 items-center text-[13px] font-medium transition-colors duration-150 [@media(pointer:fine)]:min-h-8",
                  current ? "text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="flex h-full items-stretch">
      {NAV.map((item) => {
        const current = isCurrent(item.href, pathname);
        return (
          <li key={item.href} className="relative flex">
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={clsx(
                // On a touch screen the hit area runs 10px into the tagline row below
                // (nothing there is interactive); the drawn row stays 34px.
                "relative flex items-center px-[7px] text-[13px] after:absolute after:inset-x-0 after:top-0 after:-bottom-[10px] [@media(pointer:fine)]:after:hidden leading-none font-semibold [font-stretch:62%] transition-colors duration-150 sm:px-[10px]",
                current ? "text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {item.label}
            </Link>
            {current ? (
              <ViewTransition name="soffit-tick">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-[7px] bottom-0 h-px bg-ink sm:inset-x-[10px]"
                />
              </ViewTransition>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
