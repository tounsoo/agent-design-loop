import type { LoopGraph } from "./src/lib/loop";

/**
 * The design loop every agent follows, as a graph. Start at `start`, do what
 * each node's label says, and take the edge whose `when` matches the outcome.
 * An eval node runs its scripts. A human node stops the run until its gate's
 * review approves or declines. `npm run check:loop` validates this file and
 * keeps the diagram in docs/how-it-works.md in step with it.
 */
const designLoop = {
  start: "read",
  state: [
    { id: "inventories", what: "The product's harness.config.ts and every inventory it names: inputs, rules, catalog, layouts, content layouts, page types and flows." },
    { id: "rules", what: "The harness rules, which check:rules in package.json runs on every product, and each product's opt-outs." },
    { id: "proposals", what: "proposals/, the requests and decisions that change an inventory or a rule." },
    { id: "ui", what: "The product's UI under its paths.source." },
    { id: "review", what: "The product's review/ folder: the notes on the judgment the checks leave open, and each change's screenshots with their gallery." },
  ],
  nodes: [
    { id: "read", kind: "llm", label: "Read the inventories in the order AGENTS.md lists", reads: ["inventories", "rules", "proposals"] },
    { id: "route", kind: "router", label: "Does the screen fit an approved pattern?" },
    { id: "build", kind: "llm", label: "Build the screen from the catalog, inside the inventories", reads: ["inventories"], writes: ["ui"] },
    { id: "checks", kind: "eval", label: "Run the build gate", run: ["check:fixtures", "check"], reads: ["inventories", "rules", "ui"] },
    { id: "triage", kind: "router", label: "Can the fix stay inside the inventories?" },
    { id: "propose", kind: "llm", label: "Write a proposal with a reason, every state, a preview and a graduation", writes: ["proposals"] },
    { id: "scope", kind: "router", label: "Does the proposal only add members to an inventory list?", reads: ["proposals"] },
    { id: "proposal-pull-request", kind: "checkpoint", label: "Open a pull request with the proposal", reads: ["proposals"] },
    { id: "approval", kind: "human", label: "A designer reviews the proposal's pull request", approver: "designer", gate: "/proposals/", reads: ["proposals"] },
    { id: "graduate", kind: "llm", label: "Graduate it into the inventory data or a harness rule", reads: ["proposals"], writes: ["inventories", "rules"] },
    { id: "screenshots", kind: "llm", label: "Capture each state the change touches, with a gallery the pull request links", reads: ["ui"], writes: ["review"] },
    { id: "note", kind: "llm", label: "Write the leftover judgment in the review notes", writes: ["review"] },
    { id: "pull-request", kind: "checkpoint", label: "Open the pull request for review", reads: ["ui", "review"] },
  ],
  edges: [
    { from: "read", to: "route" },
    { from: "route", to: "build", when: "fits" },
    { from: "route", to: "propose", when: "needs a new pattern" },
    { from: "build", to: "checks" },
    { from: "checks", to: "screenshots", when: "pass" },
    { from: "checks", to: "triage", when: "fail" },
    { from: "triage", to: "build", when: "inside" },
    { from: "triage", to: "propose", when: "outside" },
    { from: "propose", to: "scope" },
    { from: "scope", to: "graduate", when: "only adds" },
    { from: "scope", to: "proposal-pull-request", when: "anything else" },
    { from: "proposal-pull-request", to: "approval" },
    { from: "approval", to: "graduate", when: "approved" },
    { from: "approval", to: "build", when: "declined" },
    { from: "graduate", to: "build" },
    { from: "screenshots", to: "note" },
    { from: "note", to: "pull-request" },
  ],
} as const satisfies LoopGraph;

export default designLoop;
