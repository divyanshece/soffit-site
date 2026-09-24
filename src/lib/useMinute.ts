"use client";

import { useSyncExternalStore } from "react";

/**
 * The current minute, as a timestamp (ms) floored to the minute — or null on the
 * server and during hydration, so clocks render a fixed blank first and never
 * mismatch. One shared timeout fires on each minute boundary, and none runs
 * while the tab is hidden; the value catches up when it is shown again.
 */
const listeners = new Set<() => void>();
let timer = 0;

const minute = () => Math.floor(Date.now() / 60_000) * 60_000;

function arm() {
  window.clearTimeout(timer);
  timer = 0;
  if (!listeners.size || document.visibilityState !== "visible") return;
  timer = window.setTimeout(() => {
    listeners.forEach((l) => l());
    arm();
  }, 60_000 - (Date.now() % 60_000) + 20);
}

function onVisibility() {
  listeners.forEach((l) => l());
  arm();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) document.addEventListener("visibilitychange", onVisibility);
  arm();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) document.removeEventListener("visibilitychange", onVisibility);
    arm();
  };
}

export function useMinute(): number | null {
  return useSyncExternalStore<number | null>(subscribe, minute, () => null);
}
