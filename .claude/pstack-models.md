# pstack model configuration

This project's sheet. In this repository it replaces the user's pstack-models.md; ignore that sheet's lines.

Per-role model overrides for pstack skills. Each pstack SKILL.md names its defaults in a Models section; the values here override those defaults. Delete a line to fall back to the skill default. A value of `inherit-parent` or `auto` runs that role on the parent session's model (the `Agent` call omits `model`); an alias entry in a panel list still counts toward that panel's fan-out. A model may carry a reasoning effort, as in `opus @xhigh` (levels: low, medium, high, xhigh, max); the role's subagent then runs at that level, each entry of a panel list on its own. `default effort` sets the level for a value without one; `session` keeps the parent session's effort. `session hook: off` stops pstack's routing hook from injecting the poteto-mode mandate; any other value, or no line, leaves it on.

No Fable in this repository. Upstream pstack defaults name `fable` for strongest judgment and every panel, so the strongest judgment, arena, architect and interrogate lines below override those defaults. Deleting one of those lines would bring Fable back. A change to a line here needs Ben's yes.

feature, refactoring: sonnet
bug-fix: opus
perf-issue: opus
hillclimb: opus
judgment and prose: opus
strongest judgment: opus
how explorer: opus
how explainer: opus
why investigators: opus
why synthesizer: opus
reflect tooling: opus
reflect judgment, divergent, synthesizer: opus
arena runners: opus, sonnet, haiku
arena cross-judge pool: opus, sonnet, haiku
swarm workers: opus
architect runners: opus, sonnet, haiku
interrogate reviewers: opus, sonnet, haiku
thermos reviewers: opus
no-comments reviewer: opus

default effort: session
session hook: on
