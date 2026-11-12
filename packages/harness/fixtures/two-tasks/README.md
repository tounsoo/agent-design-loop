# Two tasks

A product the size of a fixture, not Meridian: a notes inbox with two tasks, its own flow and its own modeled states. Its `case.ts` points the fixture product's inputs and flow at these files. It shows that `check:step-budget` measures every task the config maps, not only the first, and that `check:target-size` opens every scenario in its `scenarios.ts`, including one that carries the product's own data, a page, beside its state.

The illegal cases `second-task-over-budget`, `task-without-graph` and `graph-without-task-id` reuse these inputs with a flow of their own.
