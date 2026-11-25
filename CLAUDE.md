@AGENTS.md

## Claude only

- Work happens in a T3 Code thread (Claude Code) on a branch named `t3/<slug>`. The thread opens a ready pull request into `main`, gets CI green, and a Gemini 4 Neon review subagent reviews it, at most 3 rounds. Mike merges only on Ben's word.
- Threads never merge, never force-push and never rebase pushed history. To bring in the base, merge `origin/main`. Do not edit `AGENTS.md` or `CLAUDE.md` outside a pull request Ben approves.
- Threads may use `gh` and the GitHub MCP tools for GitHub work.
- Matt Pocock's skills are the workflow skills: `tdd`, `diagnosing-bugs`, `code-review`, `pr`, `grill-with-docs`, `to-spec` and `to-tickets`. They come from the user's install, not from this repo.
- The project verify skill is `.claude/skills/verify/SKILL.md`. Run it on the commit that ends a review round.
- `Agent` has no `readonly` parameter. When a subagent must not change anything, tell it in its prompt not to edit files, commit or push.
- The critique step's reviewer model is `reviewerModel` in `critique.config.json`, never the model that built the change.
