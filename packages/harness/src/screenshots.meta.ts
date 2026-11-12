import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "The design loop's `screenshots` step: captures each preview before and after a change into a gallery the pull request links.",
  tool: true,
  flags: [
    { name: "--out", value: "<dir>", what: "The gallery folder, `products/<name>/review/screenshots/<change>`. Each run replaces it whole." },
    { name: "--state", value: "<state>", what: "Keeps the previews of that state. Repeat it for each state the change touches, or leave it out for every preview." },
    { name: "--base", value: "<ref>", what: "Also captures the previews at that commit, so the folder holds `before/` and `after/`." },
    { name: "--pin", value: "<dir>", what: "Takes only `--config`. Points each image's link in a committed gallery at the raw PNG at that commit, and prints the line for the pull request description. It refuses a folder with anything but its `README.md` uncommitted." },
  ],
  details: [
    "It opens the previews `check:target-size` opens, at 1280 by 900 in the same Chrome, and writes `before/` and `after/` PNGs and a gallery `README.md` whose images each link to their own file. Commit the folder, run `--pin`, commit the `README.md` again, and put the line `--pin` prints in the pull request description with `<sha>` replaced by the pushed commit's full SHA, with its whole `https://github.com/` address: a relative path breaks in the GitHub app and in email, and a branch link breaks once the branch is deleted. Images in the description itself don't come through from an agent. [Proposal 2026-11-11-screenshot-gallery](../../../proposals/2026-11-11-screenshot-gallery.md) records it.",
  ],
} satisfies CheckMeta;
