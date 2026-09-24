import { useSyncExternalStore } from "react";

/**
 * prefers-reduced-motion, without the animation runtime. For components that
 * only need to know the preference (the eyes), so a page that has nothing else
 * moving does not load motion just to ask. False on the server and while
 * hydrating; the browser's answer takes over after that, so nothing mismatches.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
