# Proposal 0010: The agent records its walk of the design loop in a trace

Status: decided. Ben decided on Nov 11 to close the gap proposal 0009 left open, that the graph is followed but not run, with a record CI checks. This records that change, which lands with its own pull request, so nothing graduates later.

Rule or input: the harness gains one check, `check:trace`, one helper script, `loop:step`, and a `traces/` folder at the repository root. No product input, rule cap, catalog export, flow state, adapter field, product config or design loop node changes. No rule in `check:rules` changes, so no product can opt out of the new check.

## Reason

[Proposal 0009](0009-design-loop-graph.md) made the loop a graph that `check:loop` validates. Nothing executes it. The agent follows it, and until now nothing recorded whether it did, so a reviewer had only the diff to go on.

With a trace, the agent appends one line per node as it walks the graph. `check:trace` reads the change against its base and fails when:

- the change touches a product's directory, the folder of any `harness.config.ts` outside the harness package, and adds or edits no trace under `traces/`
- a trace it adds or edits does not start at the graph's `start`, names a node the graph does not have, or steps between two nodes no edge connects
- a router, eval or human step has no `when`, or one its node has no edge for, or the next step is not where that `when` leads
- after a node with no edge out, which ends a run, the next step is not a new run at `start`. After a checkpoint with an edge out, which pauses the run, a new run may start too
- a file the change adds under `traces/` is not a `.jsonl` trace, other than the folder's README
- the trace stops anywhere but a checkpoint
- the trace stops at a node that ends a run, and the last change to state an eval node reads has no passing eval node after it, so the run would end on work the build gate never passed. This is the rule `check:loop` holds the graph's ends to. A run paused at the proposal's checkpoint may stop with its work unchecked, because the gate failed and the fix waits on approval

A trace is the agent's own record. It shows that the agent recorded a walk the graph allows, not that the agent did the work each line names: an agent can write `{"node": "checks", "when": "pass"}` without running the gate. CI still runs the gate on every pull request, so a false `pass` does not get unchecked UI merged. What the trace adds is a record a reviewer can hold the diff against: whether the run went through a proposal, whether the gate failed first, whether a person approved. A runtime that executes the graph would make the record a proof, at the cost of a dependency, and it would read the same graph file.

`check:trace` is not part of the build gate. The agent runs the gate at the eval node, in the middle of its walk, when the trace does not yet end at a checkpoint. So CI runs `check:trace` after `check:loop`, and the agent runs it before it pushes.

A change that touches no product, such as this one, needs no trace. A trace it does add is still checked.

## Preview

A trace is JSON Lines under `traces/`, one file per change. `npm run loop:step -- traces/<change>.jsonl <node> [when]` appends a step with the time and refuses one the graph does not allow. A run that failed the gate once:

```jsonl
{"node":"read","at":"2026-11-11T10:56:50.354Z"}
{"node":"route","when":"fits","at":"2026-11-11T10:56:50.680Z"}
{"node":"build","at":"2026-11-11T10:56:50.960Z"}
{"node":"checks","when":"fail","at":"2026-11-11T10:56:51.271Z"}
{"node":"triage","when":"inside","at":"2026-11-11T10:56:51.573Z"}
{"node":"build","at":"2026-11-11T10:56:51.861Z"}
{"node":"checks","when":"pass","at":"2026-11-11T10:56:52.151Z"}
{"node":"note","at":"2026-11-11T10:56:52.421Z"}
{"node":"pull-request","at":"2026-11-11T10:56:52.687Z"}
```

A change to `products/meridian` with no trace fails with `trace: the change touches products/meridian and adds no loop trace under traces/.` A trace that skips the gate, `build` then `note`, fails with `line 4 goes from build to note, an edge the graph does not have. It goes to checks.`

## Graduation

No file changes later. These change in the same pull request:

- `packages/harness/src/lib/trace.ts` parses a trace and checks the walk, with Vitest tests in `packages/harness/src/lib/trace.test.ts`.
- `packages/harness/src/check-trace.ts` is the new check, and `packages/harness/src/loop-step.ts` the helper. `package.json` names both. `.github/workflows/ci.yml` runs `check:trace` last in the `check` job.
- `packages/harness/src/lib/base.ts` resolves the change's base, which `check:inventories` and `check:trace` now share. Both read `INVENTORY_BASE`.
- `traces/README.md` describes the folder.
- The docs: `AGENTS.md` tells the agent to record its walk, `packages/harness/docs/how-it-works.md` explains the trace and what it does not prove, and the harness README, the root README, `proposals/README.md` and `CLAUDE.md` name the check.
