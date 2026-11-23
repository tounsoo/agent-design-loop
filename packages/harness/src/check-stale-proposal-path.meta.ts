import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "A proposal's later-landing paths exist, and an example that names a proposal number names that proposal or a number no proposal has.",
  fails: [
    "A proposal names `proposals/NNNN-slug.md` when `proposals/NNNN-` is a different file.",
    "A section headed \"after approval\" names a `src/`, `scripts/` or `fixtures/` path, or any other path that does not exist, without saying the path was corrected.",
  ],
  details: [
    "Paths a merged proposal's own pull request changed stay as they were, including `src/` from before proposal 0006. The proposals README maps those once. Only the section that says where a change still to come lands has to name a path that exists now, and a corrected path says so. `packages/harness/src/lib/stale-proposal-path.test.ts` feeds the check proposals 0001 and 0008 from before e8cc09b, and the proposals folder this check reads.",
  ],
} satisfies CheckMeta;
