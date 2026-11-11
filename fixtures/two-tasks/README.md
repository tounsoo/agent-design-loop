# Two tasks

A product the size of a fixture, not Meridian: a notes inbox with two tasks, its own flow and its own modeled states. Its config, `harness.config.ts`, names these files, and the cases in `scripts/check-fixtures.ts` pass it with `--config`. It shows that `check:step-budget` measures every task the config maps, not only the first, and that `check:target-size` opens every modeled state, including one no preview names.

The illegal cases `second-task-over-budget`, `task-without-graph` and `stale-preview` reuse these inputs with a config of their own.
