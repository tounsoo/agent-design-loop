---
status: graduated
changes: []
---
# Proposal 0013: The step budget measures every route, not only the shortest

Decided, and graduated with its own pull request. Ben asked for a separate pull request after the Nook demo let a held room be booked: hold then book is a second route to `booked`, three steps long, and `check:step-budget` measured only each task's shortest path, so it never saw it. That route fits book-room's budget of 3, but a longer one would have passed the same way. This records how the check reads now. No inventory changes, so it lists no changes and graduates at once.

Rule or input: how `check:step-budget` measures a task. No product input, `max_steps`, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config changes. `check:rules` does not change, so no product can opt out of anything new.

- **Every route.** The modeled and shipped shortest paths must still fit `max_steps` and be the same steps. Now every other route to the same success must fit too, in the task graph and in the shipped reducer.
- **What a route is.** A step is an event that a task graph in the same `flows[]` entry names as a step. A route takes any steps the flow allows, in any order, each at most once and never back to a state it has already passed, then finishes the shortest way any user event allows. In Nook, hold is the hold-room task's step, so choose, hold, book is a route to book-room's success. In the task graph, every edge is a step.
- **What is not a route.** An event no task names, such as opening Room details, changing the length or Back, is a detour a person chooses, so it counts only when the finish needs it. So is taking a step a second time, such as selecting one row, then a second, then clearing the first: two rows that share a select step would otherwise make every selection a route. A reducer that made a held room need a confirm before Book would make choose, hold, confirm, book a 4-step route, and fail.
- **Bounded.** The search stops a route as soon as it passes the budget, so it never walks deeper than `max_steps`. The shortest finish from each state is computed once. When no state earlier on the route can come back after a state, what follows that state does not depend on how the route reached it, so it is measured once: eight settings that can be made in any order are 256 states, not 40,320 orders. A task that would need more than 10,000 states measured, or more than 200,000 states looked at to find the shortest finishes, as a counter beside a dead end can, fails with its own message instead of running on.
- **Same state.** Two states are the same when they hold the same values: keys are read in sorted order, and a Set or Map by what it holds, where `JSON.stringify` wrote both as `{}`. The shortest-path search reads states the same way.
- **Output.** For each task, the check prints the longest modeled and shipped route next to the shortest paths, and a failure names the route and its length.

## Reason

The step budget is the harness's measure of interaction cost, and a person does not always take the shortest path. A flow that lets one task lead into another, like hold then book, adds a route nobody reviewed against the budget. The shortest path stayed 2 steps, so the check would have passed a hold that needed three more steps before booking. Counting every event as a step would fail on optional looks instead: in Nook today, choose, change the length, open details, book is 4 steps against a budget of 3, and none of it is required. Counting only the events some task names, then the shortest finish, measures the routes the flow offers as choices without charging a person for detours they chose.

## Preview

`check:step-budget` on Nook with the reducer from the held-room demo, pull request 26, which lets a held room be booked. On main, a held room cannot be booked, so the longest route is still choose-room → book:

```
step budget: book-room (max_steps 3), products/nook/flows/booking/book-room.ts
  modeled path (2): choose-room → book
  longest modeled route (2): choose-room → book
  shipped path (2): choose-room → book
  longest shipped flow route (3): choose-room → hold → book
```

The same reducer with book-room at `max_steps` 2:

```
step budget: the shipped flow route choose-room → hold → book takes 3 steps, which exceeds max_steps 2 for book-room. Every route that finishes the task must fit, not only the shortest.
```

## Graduation

- No file changes on approval. These change in the same pull request:
  - `packages/harness/src/lib/shortest-path.ts` adds `measureRoutes` and `stateKey`, exported from the harness package, with their tests in `shortest-path.test.ts`.
  - `packages/harness/src/check-step-budget.ts` measures every route for each task.
  - The fixtures `longer-route`, `illegal/route-over-budget` and `illegal/modeled-route-over-budget`, and the docs: the harness README, `how-it-works.md`, `CLAUDE.md` and the verify skill.
- What the check still cannot do: tell an abandoned branch from a choice. If a product adds a task whose steps a person can start and then leave, such as writing a change request before approving instead, that route counts against the other task's budget too. And it measures only the routes the reducer allows: whether a route should exist is the reviewer's question.
