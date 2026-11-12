# Loop traces

Each file here is one change's record of the agent walking the design loop in [`packages/harness/design-loop.ts`](../packages/harness/design-loop.ts). It is JSON Lines, one step per line, appended as the agent goes:

```jsonl
{"node":"read","at":"2026-11-11T10:56:50.354Z"}
{"node":"route","when":"fits","at":"2026-11-11T10:56:50.680Z"}
```

`node` is the node's id. `when` is the edge a router, eval or human node took, and only those nodes carry one. `at` is optional. Append with `npm run loop:step -- traces/<change>.jsonl <node> [when]`, which adds the time and refuses a step the graph does not allow. Name the file after the change, such as its branch with `/` turned into `-`.

`npm run check:trace` fails a change that touches a product and adds no trace here, and any trace the change adds or edits that is not a walk the graph allows, that stops anywhere but a checkpoint, or that ends its run on work no passing eval node checked. A run may pause at the proposal's checkpoint, which has an edge out, with its work unchecked, and a new run may start after any checkpoint. Name every file here `<change>.jsonl`, since the check fails any other file it finds here but this README. CI runs it after the build gate. Run it yourself before you push.

Each line is read against the design loop as it stood in the commit that added it, and a line not yet committed against the loop in the working tree. So when the loop changes after you record a run, for example when you merge `main` into your branch, the run still passes as it is. Don't rewrite it: walk the new loop in a new run. A rebase moves the lines onto commits under the new loop, where the old run fails again, so merge `main` in rather than rebase.

A trace is a record the agent writes, not proof the agent did the work it names. [Proposal 0010](../proposals/0010-loop-trace.md) says why it is still worth keeping.
