---
status: graduated
changes:
  - flows
  - paths.flows
---
# Proposal 0004: Name task graphs and previews in the harness config

Decided, and graduated with its own pull request. Ben approved the split plan, and this is its step 4, "rule semantics". It records a harness config change that lands with the checks that read it, so nothing graduates later.

Rule or input: the harness config, `harness.config.ts`. Each entry in `flows` gains two fields, and `paths.flows` goes away. No product input, rule cap or catalog export changes.

- `flows[].tasks` maps a task id in `tasks` to the task graph module that models it. `check:step-budget` measures every task through the module named there. It used to find graphs by looking for a `graph.ts` in each directory under `paths.flows`.
- `flows[].previews` lists, for a modeled state, the query strings `check:target-size` adds to `?state=<state>`. Every modeled state is opened: bare when it has no entry, once per query string when it has one. The script used to keep its own hand list of ten preview URLs.
- `paths.flows` was only where `check:step-budget` looked for `graph.ts`. Nothing reads it now.

## Reason

A second product has to be able to use the rules without editing them. Two of the checks still assumed Meridian's layout.

The step budget found task graphs by a file name in a folder. A product with two tasks in one flow, or a graph under another name, had nowhere to say which graph models which task. A map in the config says it once, and the check fails a task with no entry, so a new task cannot skip its budget.

The target-size list was copied from Meridian by hand. A modeled state added later was never opened unless someone also edited the script. Deriving the previews from `modeledStates` opens a new state without anyone remembering to. The extra query strings, like `page=detail`, are Meridian's own way to reach a state's screens, so they belong in its config, not in the script. An entry for a state that is not modeled fails the check, because it would open the default page and measure nothing new.

Both fields are under the same gate as the rest of the config. A changed map could stop measuring a task, and a dropped preview could stop measuring a screen.

## Preview

Meridian's config after the change:

```ts
flows: [
  {
    states: "src/flows/invoice-approval/states.ts",
    views: "src/features/invoice-approval/views.tsx",
    tasks: {
      "approve-vendor-invoice": "src/flows/invoice-approval/graph.ts",
    },
    previews: {
      ready: ["page=collection", "route=invoices", "route=vendors", "page=detail", "page=detail&branch=request"],
      "invoice-approved": ["page=detail"],
      "changes-requested": ["page=detail"],
    },
  },
],
```

Meridian's results do not change. `check:step-budget` measures the same graph, `open-invoice → approve`, 2 steps against 3. `check:target-size` opens the same ten previews in the same order: `loading`, `empty` and `error` bare, `ready` five ways, and the two outcome states on the detail page.

## Graduation

- No file changes on approval. These change in the same pull request:
  - `harness.config.ts` and `scripts/lib/config.ts`, which parses the two fields and drops `paths.flows`.
  - `scripts/check-step-budget.ts` reads `flows[].tasks`.
  - `scripts/check-target-size.ts` and `scripts/lib/previews.ts` derive the previews.
