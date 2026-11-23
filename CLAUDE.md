@AGENTS.md

@.claude/pstack-models.md

## Claude only

- Skills and agents from the pstack-claude plugin have the `pstack:` prefix. This repo does not vendor the plugin. A local Claude Code session gets `pstack@pstack-claude` from `.claude/settings.json`. A Duet thread loads nothing in `.claude/` by itself, and the `@` imports above do not expand: read `AGENTS.md`, then `.claude/pstack-models.md`, then `.claude/thread-start.md`, which installs pstack-claude into a temp folder. The project verify skill is `.claude/skills/verify/SKILL.md` in this repo. Plugin skills are read from that temp folder, as the thread-start page says.
- `Agent` has no `readonly` parameter. Where a skill spawns a subagent with `readonly: true`, tell it in its prompt not to edit files, commit or push.
- GitHub work uses the GitHub MCP tools, not `gh` or the `watch-pr` script.
- Fable runs only where `.claude/pstack-models.md` names it or where Ben approves it in his own message in that run. This repo's sheet names no Fable.
- Duet threads: nothing in `.claude/` loads by itself, and the `@` imports above do not expand. Read `AGENTS.md`, then `.claude/pstack-models.md`, then `.claude/thread-start.md`.
