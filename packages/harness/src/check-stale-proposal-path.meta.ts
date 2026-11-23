import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "A proposal's later-landing section does not name a moved src, scripts or fixtures path, and an example that names a proposal number names that proposal or a number no proposal has.",
  fails: [
    "A proposal names `proposals/NNNN-slug.md` when `proposals/NNNN-` is a different file.",
    "A section headed \"after approval\" names a `src/`, `scripts/` or `fixtures/` path without saying the path was corrected.",
  ],
  details: [
    "Paths a merged proposal's own pull request changed stay as they were, including `src/` from before proposal 0006. The proposals README maps those once. A file the section says a later change will add, such as `packages/harness/src/check-new-thing.ts`, is not a failure: it does not exist yet. `packages/harness/src/lib/stale-proposal-path.test.ts` feeds the check proposals 0001 and 0008 from before e8cc09b, and that future path. It skips when the commit is not in the clone.",
  ],
} satisfies CheckMeta;
