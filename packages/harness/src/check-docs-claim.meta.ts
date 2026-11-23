import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "CODEOWNERS, the gallery proposal and AGENTS.md do not claim review is required, that a file link opens full size, or that a cloud agent cannot clone home.",
  fails: [
    "CODEOWNERS says review is required. GitHub requests review and blocks a merge only once branch protection requires code owner review.",
    "A markdown sentence says a link to the file opens the image full size, and does not say that no longer holds or name raw.githubusercontent.com.",
    "AGENTS.md says a cloud agent cannot clone home, instead of reading `/agent/repos/home` when that directory exists.",
  ],
  details: [
    "The three claims are prose, so a type cannot hold them, and generating CODEOWNERS, the proposal and AGENTS.md from one module would hide the instructions those files are. The check names the sentence to write. `packages/harness/src/lib/docs-claim.test.ts` feeds it the wording from the commits that had each claim. It skips when the commit is not in the clone. This check reads the tree.",
  ],
} satisfies CheckMeta;
