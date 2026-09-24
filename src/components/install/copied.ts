/**
 * One successful copy, announced on the window.
 *
 * The Copy button and the light under the notch are at opposite ends of the
 * hero — the button is deep inside a <Section>, the Eaves hang off the top of
 * the <Plane> — and the page between them is a server component. A DOM event is
 * the whole coupling: no provider, no state lifted through markup that has no
 * state, and nothing extra shipped to a page that does not listen.
 */
export const COPIED = "soffit:copied";

export function announceCopied() {
  window.dispatchEvent(new CustomEvent(COPIED));
}

export function onCopied(run: () => void) {
  window.addEventListener(COPIED, run);
  return () => window.removeEventListener(COPIED, run);
}
