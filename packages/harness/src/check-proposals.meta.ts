import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Every proposal has its fields and sections, a new one has a dated name, and each status moves one step at a time from the base.",
  fails: [
    "A proposal without front matter, with an unknown or missing `status` (`open`, `decided` or `adopted`) or `changes`, or a field that is not a list.",
    "`adds` or `tightens` beside `changes`, `retires` or `opts-out`, or on a proposal that is not `adopted`, and an `opts-out` entry that is not `<rule> for <paths.source>`.",
    "An empty or missing `## Reason`, `## Preview` or `## Adoption`, and the names before the rename, `status: graduated` and `## Graduation`, which only a base proposal may still have.",
    "A `## States` section that misses an edge case (Empty, Loading, Error, Long content, Permissions, Over time), gives a state no text, marks one `Out of scope` without a reason, lists only edge cases, or puts `None` beside other states.",
    "Compared with the base: a status that moves more than one step or backwards; a change to a decided or adopted proposal's `changes`, `retires`, `opts-out`, `adds` or `tightens`; a decided or adopted proposal renamed or deleted.",
    "Compared with the base: a new proposal that starts `adopted` while it lists anything under `changes`, `retires` or `opts-out`.",
    "Compared with the base: a proposal that lists anything under `changes` or `adds` with no `## States` when it is new or moves from `open` to `decided`, and a decided or adopted proposal that drops the `## States` it had.",
    "A proposal the change adds or renames whose file name is not a real date no later than tomorrow in UTC and a lowercase slug, such as `2026-11-12-side-panel.md`, or that shares its name with a proposal in another proposal folder.",
  ],
  details: [
    "It reads `proposals/`, each product config's `paths.proposals`, and every other folder named `proposals` that git knows of outside the harness package, so a proposal seeded for a later `paths.proposals` move is checked when it lands. A proposal is a file ending in `.md`, in that case, other than `README.md`; a `.MD` file is not read.",
    "It takes no `--config`. Proposals already on the base keep their text, without `## States`, until they move to `decided`. The proposals that merged with a number, from 0001, keep those names. `proposals/README.md` has the format, and the Vitest suite in `packages/harness/src/lib/proposals.test.ts` proves the rules, since the check reads the repository's own folders.",
  ],
} satisfies CheckMeta;
