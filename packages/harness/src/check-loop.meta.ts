import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "The design loop graph in `packages/harness/design-loop.ts` is one an agent can follow, and the diagram in `how-it-works.md` is the one it draws.",
  flags: [{ name: "--write", what: "Redraws the diagram in `docs/how-it-works.md` from the graph." }],
  fails: [
    "A dangling edge or an unreachable node.",
    "An eval node that names a script `package.json` lacks, or has no retry on `fail`.",
    "A human gate with no `CODEOWNERS` owner.",
    "An end the run can reach without an eval node passing after the last change.",
    "A diagram in `packages/harness/docs/how-it-works.md` that is not the one the graph draws.",
  ],
  details: [
    "The loop is the harness's, and every product follows the same one. [Proposal 0009](../../../proposals/0009-design-loop-graph.md) records the graph, and `packages/harness/src/lib/loop.test.ts` tests it.",
  ],
} satisfies CheckMeta;
