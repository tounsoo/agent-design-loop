import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "The harness's own tests: every illegal fixture case fails with its expected message, and every legal case passes with its.",
  fails: [
    "An illegal case whose check passes, or fails without the phrase its `case.ts` expects; a legal case whose check fails, or passes without its phrase.",
    "A case folder with no `case.ts`, a `case.ts` that names a path that does not exist or a script that is not one harness check, or an expected phrase that is part of a path the case names, since a crash prints the path.",
    "A case name given on the command line that is no case folder.",
  ],
  details: [
    "`packages/harness/fixtures/product/` is a small product with its own `harness.config.ts` that every check passes. Every other folder directly under `fixtures/` or `fixtures/illegal/` is a case whose `case.ts`, plain literals, changes some of that config's paths and names the checks to run on the result, each as its npm script with `--config`, with the phrase each must print. A case that sets `base` may also give `proposals` and `baseProposals`, folders `check:inventories` reads as the change's proposals and the base's, matched by file name. The stand-in design system in `fixtures/fake-ds/` shows a check reads its names from the adapter, and small products of their own show a rule reads its product's config and inputs.",
    "Name cases to run only those: `npm run check:fixtures -- illegal/two-primaries`. The cases that run a Chrome check without `--list` open a page, so they need Chrome as the check does; the build gate section above names the Chrome lookup.",
  ],
} satisfies CheckMeta;
