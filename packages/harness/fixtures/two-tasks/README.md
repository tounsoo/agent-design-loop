# Two tasks

A product the size of a fixture, not Meridian: a notes inbox with two tasks, its own flow and its own modeled states. Its `case.ts` points the fixture product's inputs and flow at these files. It shows that `check:step-budget` measures every task the config maps, not only the first, and that `check:target-size` opens every modeled state, including one no preview names.

The illegal cases `second-task-over-budget`, `task-without-graph`, `graph-without-task-id`, `stale-preview` and `preview-sets-state` reuse these inputs with a flow of their own.
