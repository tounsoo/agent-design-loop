import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Every route that finishes a task, not only the shortest, fits that task's `max_steps`, in the task graph and in the shipped reducer.",
  fails: [
    "A task in the inputs' `tasks` with no task graph mapped under `flows[].tasks`, a mapped id that is not a task, or a graph whose `taskId` is not the id it is mapped under.",
    "A modeled path (the task graph's shortest) or shipped path (the flow's `transition` reducer's shortest, from `flowStart` over `userEvents` to the task's `success_state`) that is missing or longer than `max_steps`.",
    "A modeled path and shipped path that are not the same steps.",
    "Any longer route to the same success over `max_steps`, in the graph or the reducer.",
    "A reached flow state with no name: neither a `status` field nor a `flowStatus(state)` exported by the graph module.",
    "A task whose search would measure more than 10,000 states, or look at more than 200,000 states for the shortest finishes.",
  ],
  details: [
    "A step is an event that a task graph in the same `flows[]` entry names, so with a hold-room task beside book-room, hold then book is a route to booked. A route takes any steps the flow allows, each at most once and never back to a state it has passed, then finishes the shortest way any user event allows. Events no task names, such as an optional look or Back, count only when the finish needs them. The search stops a route once it passes the budget, and measures a state once when no earlier state on the route can come back after it, so steps that can come in any order do not multiply. Two states are the same when they hold the same values, whatever order their keys were written in, and a Set or Map is read by what it holds. `measureRoutes` in `lib/shortest-path.ts` does the search.",
    "Steps that are not events, such as scrolling, reading or opening a disclosure to find something, cost nothing here. When the shortest path has two candidates, `shortestPath` returns the first in edge order, so order the edges or `userEvents` so the reviewed one comes first.",
    "For each task it prints `longest shipped flow route (N)` beside its verdict; quote that line when a change touches a reducer, a task graph or a budget.",
  ],
} satisfies CheckMeta;
