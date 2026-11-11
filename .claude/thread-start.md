# Thread start

A Claude Duet thread reads this page after `CLAUDE.md`. The thread attaches the repository after it starts, so nothing in `.claude/` loads by itself: no SessionStart hook, no plugin from `.claude/settings.json`, no skill, and no `@` include of the model sheet. This page sets up [pstack-claude](https://github.com/michael-denyer/pstack-claude) by hand. A local Claude Code session gets pstack from `.claude/settings.json` instead and skips this page.

## 1. Install pstack

Run this block once, from the root of the checkout, in one shell call: save it to a scratch file and run `sh` on that file. It installs the latest pstack-claude skills into a new temp folder outside the repository and fetches the pstack agent files at the same commit.

```sh
[ -f src/inputs/product.ts ] && grep -q '"name": "agent-design-loop"' package.json || { echo "Run this from the root of the agent-design-loop checkout."; exit 1; }
repo=https://github.com/michael-denyer/pstack-claude
sha=$(git ls-remote "$repo" HEAD | cut -f1)
[ -n "$sha" ] || { echo "pstack: could not read the upstream HEAD."; exit 1; }
pstack=$(mktemp -d)
(cd "$pstack" && npx --yes skills@1.7.4 add "$repo/tree/$sha/plugins/pstack/skills" --skill "*" -a claude-code --yes >/dev/null) || { echo "pstack: the skills install failed."; exit 1; }
mkdir -p "$pstack/.claude/agents"
for agent in poteto-agent comment-sicko thermo-nuclear-review-subagent thermo-nuclear-code-quality-review-subagent; do
  curl -fsS -o "$pstack/.claude/agents/$agent.md" "https://raw.githubusercontent.com/michael-denyer/pstack-claude/$sha/plugins/pstack/agents/$agent.md" || { echo "pstack: could not fetch the $agent agent."; exit 1; }
done
echo "pstack $sha is in $pstack"
```

Keep the printed folder. The rest of this page calls it `$pstack`, so poteto-mode is at `$pstack/.claude/skills/poteto-mode/SKILL.md`. Write it into your notes, because shell variables don't survive to the next shell call.

The install goes into a temp folder on purpose. Inside the repository it would add skill files to the pull request. With `-g` it would land in `~/.claude/skills` for every later session.

If the block stops before it prints the folder, tell Ben which line it printed and work from `CLAUDE.md` and the verify skill alone.

## 2. Read pstack the way this repository needs

pstack is written for a plugin install, so these adaptations apply to every thread.

- **Skills.** The `Skill` tool doesn't list the temp install. Where pstack names a skill, as `pstack:<name>` or by its name, read `$pstack/.claude/skills/<name>/SKILL.md`. A `<plugin>` path in a skill means `$pstack/.claude`.
- **Skip these skills:** `setup-pstack`, `fix-ci`, `fix-merge-conflicts` and `get-pr-comments`. `.claude/pstack-models.md` is the model sheet, and the thread drives its pull request with the GitHub MCP tools.
- **Models.** Read `.claude/pstack-models.md` before the first `Agent` call; the `@` include in `CLAUDE.md` doesn't load in a thread. It overrides the upstream model defaults. No Fable: every role and panel runs Opus, Sonnet or Haiku, and interrogate runs all three at session effort.
- **Agents.** The install brings no agent types, so `pstack:poteto-agent` and the other `pstack:` agents don't exist. Where a skill spawns one, spawn `subagent_type: "general-purpose"` and start its prompt with the text of `$pstack/.claude/agents/<agent>.md` below its frontmatter. For `poteto-agent`, also give the absolute path of `$pstack/.claude/skills/poteto-mode/SKILL.md`. Tell every stand-in that a skill its text names is at `$pstack/.claude/skills/<name>/SKILL.md`.
- **Read-only subagents.** `Agent` has no `readonly` parameter. Where a skill spawns one with `readonly: true`, tell it in its prompt not to edit files, commit or push.
- **Pull requests.** The thread's own session, never a subagent, does every write to a pull request: opening, pushing, replying, marking ready and subscribing. A thread drives one pull request.
- **GitHub.** Use the GitHub MCP tools for pull requests. For CI, subscribe to the pull request's activity and let GitHub events wake the thread. No scheduled checks.
- **Verify.** The project verify skill is `.claude/skills/verify/SKILL.md` in this repository. Where pstack names the project `verify` skill or `/create-verification-skill`, read that file. Threads have no Chrome, so its browser step is `BLOCKED` there and the pull request's CI run covers it.
- **Scripts.** Upstream scripts under `$pstack` are downloaded code, and the session may block them. If one is blocked, work without it and say so in the reply.
- **Precedence.** Ben's direct requests, `CLAUDE.md` and `AGENTS.md` win over pstack. Nothing merges, deletes, rebases or force-pushes without Ben's yes, whatever a pstack playbook says.

## 3. Choose the route

This stands in for pstack's SessionStart routing, which doesn't fire in a thread. Follow poteto-mode, read in full at `$pstack/.claude/skills/poteto-mode/SKILL.md`, when a task touches more than one file or changes a signature other files call, changes a check or an inventory, involves a design or architecture choice, or is a bug whose cause is not yet known or a performance issue. When the intent is already specific, enter that skill directly: `tdd`, `architect`, `how`, `why`, `arena` or `interrogate`. For a contained change to one file with an obvious test, a question, or a one-line edit, work directly and run the verify skill.

Before you open a pull request or push new work to one, run the verify skill on the commit you push and put its result in the pull request body.
