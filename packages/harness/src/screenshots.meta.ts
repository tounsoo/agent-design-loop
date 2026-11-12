import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "The design loop's `screenshots` step: captures each scenario in four views, before and after a change, into a gallery the pull request links.",
  tool: true,
  flags: [
    { name: "--out", value: "<dir>", what: "The gallery folder, `products/<name>/review/screenshots/<change>`. Each run replaces it whole, with the `CRITIQUE.md` the `critique` step wrote of the old screenshots." },
    { name: "--state", value: "<state>", what: "Keeps the scenarios of that state. Repeat it for each state the change touches, or leave it out for every scenario." },
    { name: "--scenario", value: "<id>", what: "Keeps that scenario. Repeat it for each one." },
    { name: "--view", value: "<view>", what: "Keeps that view: `desktop-light`, `desktop-dark`, `phone-light` or `phone-dark`. Repeat it for each one, or leave it out for all four." },
    { name: "--base", value: "<ref>", what: "Also captures the same scenarios and views at that commit, so the folder holds `before/` and `after/`. At a commit from before scenarios it captures nothing there and says so." },
    { name: "--pin", value: "<dir>", what: "Takes only `--config`. Points each image's link in a committed gallery at the raw PNG at that commit, and prints the line for the pull request description. It refuses a folder with anything but its `README.md` uncommitted." },
  ],
  details: [
    "It opens every scenario at `?scenario=<id>` in four views, `desktop-light` and `desktop-dark` at 1280 by 900 and `phone-light` and `phone-dark` at 390 by 844 as a phone, each a full-page PNG named `<scenario>--<view>.png`, in the Chrome `check:target-size` uses, from the app `check:product` serves for this product or one it builds and serves on a free port, and writes `before/` and `after/` PNGs and a gallery `README.md` whose images each link to their own file. Commit the folder, run `--pin`, commit the `README.md` again, and put the line `--pin` prints in the pull request description with `<sha>` replaced by the pushed commit's full SHA, with its whole `https://github.com/` address: a relative path breaks in the GitHub app and in email, and a branch link breaks once the branch is deleted. Images in the description itself don't come through from an agent. [Proposal 2026-11-11-screenshot-gallery](../../../proposals/2026-11-11-screenshot-gallery.md) records it.",
  ],
} satisfies CheckMeta;
