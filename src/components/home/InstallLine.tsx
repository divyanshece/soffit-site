import { CopyCommand } from "@/components/install/CopyCommand";

const COMMAND = "curl -fsSL https://soffit.rtaapp.in/install.sh | bash";

/**
 * The install command in its well on the home page. It is the same well the
 * install page uses, rather than a second one that looks like it: that one
 * already falls back to selecting the command when the clipboard refuses, and
 * says so, instead of failing silently.
 *
 * The break points are where the home page has always allowed the line to
 * wrap, so "| bash" never ends up alone.
 */
export function InstallLine() {
  return (
    <CopyCommand
      // The home band's column is narrower than the install page's at the same
      // breakpoint. Keep the button under the command until the column can hold
      // the whole line beside it: at 1024–1199 the command wrapped mid-URL and
      // the Copy button stretched into a tall empty slab.
      sizeSteps="text-[15px] min-[1024px]:max-[1099px]:text-[14px] xl:text-[19px]"
      command={COMMAND}
      breaks={["https://", "soffit.rtaapp.in"]}
      note="macOS 14.0 Sonoma or later, Apple silicon only."
    />
  );
}
