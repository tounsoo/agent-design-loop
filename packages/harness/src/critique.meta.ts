import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "The design loop's `critique` step: writes the brief for a second model to judge the screenshots, then records its findings and the edge back to build or on to the note.",
  tool: true,
  flags: [
    { name: "--gallery", value: "<dir>", what: "The screenshots folder `npm run screenshots` wrote, `products/<name>/review/screenshots/<change>`." },
    { name: "--brief", value: "<file>", what: "Writes the critic's brief there. Keep it out of the repository, such as in a scratch folder." },
    { name: "--findings", value: "<file>", what: "The critic's answer, one JSON object. It is checked against the gallery, written into it as `CRITIQUE.md`, and the edge to take is printed with the block for the pull request description." },
    { name: "--trace", value: "<file>", what: "Goes with `--findings`: the change's trace, `traces/<change>.jsonl`, whose `critique` steps that took `revise` count the rounds so far." },
  ],
  details: [
    "The harness calls no model. Run `npm run critique -- --config <product config> --gallery <dir> --brief <file>` and give the brief it writes to a model other than the one that built the change, with the screenshots it names. The brief gives the product's tasks and ranked actions and a rubric of four patterns that hold on any page: hierarchy, the primary action, grouping and crowding. The critic judges relationships and weight, never counts. Each finding names its pattern, `revise` or `note`, the `after` screenshots it shows in, the problem and the fix.",
    "With `--findings` and `--trace`, a finding that calls for `revise` sends the loop back to `build`, until two rounds have: the third critique of a run prints `pass`, and what is left open goes in the review note with the `note` findings. A retake of the screenshots replaces the folder, `CRITIQUE.md` included, so the next round's critique is of the new screenshots. It is advisory: the build gate does not run it, and no check reads `CRITIQUE.md`. [Proposal 2026-11-12-critique-step](../../../proposals/2026-11-12-critique-step.md) records it.",
  ],
} satisfies CheckMeta;
