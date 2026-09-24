import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * How long `public/install.sh` actually is, read at build time.
 *
 * The home page and the install page both say the number out loud, and the
 * whole argument of that sentence is that you can read the script before you
 * run it — so the number has to come from the script rather than from two
 * literals that go quietly wrong on the first edit.
 *
 * Server only. `wc -l` counts newlines, so the trailing one is trimmed first.
 */
export const INSTALL_SCRIPT_LINES = readFileSync(
  join(process.cwd(), "public/install.sh"),
  "utf8",
)
  .trimEnd()
  .split("\n").length;
