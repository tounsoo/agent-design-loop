# Task prompt template

Use this template for every brief that starts work on agent-design-loop: the brief that starts a T3 Code thread, and the brief a thread gives a subagent or a review child. The reader knows only what the brief says, so fill each part or write "None". Delete the comments, and keep every line that is not a comment.

A thread brief keeps the Rules part and drops Subagent rules. A subagent brief keeps both parts word for word, because a subagent doesn't read `CLAUDE.md`, and its Subagent rules win where the two differ.

```md
## Goal

<!-- Ben's words for what he wants, quoted, then one sentence on the problem it solves. -->

## Setup

Repo tounsoo/agent-design-loop. Read `AGENTS.md` first. It points at the shared rules in tounsoo/home. Then read `CLAUDE.md`.
<!-- For a thread: the branch, `t3/<slug>`, and the base, `main`. For a subagent: the absolute path of the checkout or worktree, the branch, and the base commit it builds on. -->

## Scope

- In: <!-- the change, as files, behaviors, or a pull request number -->
- Out: <!-- what to leave alone, such as products/ when the task is agent setup -->
- Already done: <!-- what an earlier thread or pull request settled, so it isn't redone -->

## Done when

<!--
The result Ben can check. For a code change, name the change type from
`.claude/skills/verify/SKILL.md` and say that the verify run on the final commit ends PASS,
or that each BLOCKED step is listed under Unverified checks.
-->

## Rules

- One pull request for this task on branch `t3/<slug>`, opened ready for review, unless Ben says to push the branch and wait. Its body follows `.github/pull_request_template.md`. The repo lines are in `AGENTS.md`.
- Get CI green on the head commit, then have a Gemini 4 Neon review subagent review it, at most 3 rounds.
- Git follows tounsoo/home `standards/git.md`, as `AGENTS.md` says. Agents don't merge, force-push or rebase pushed history. To bring in the base, merge `origin/main`. Mike merges only on Ben's word. Report the pull request link, or the branch, with the verdict and wait for Ben.
- Changes to `.claude/`, `AGENTS.md` or `CLAUDE.md` need Ben's yes. The generated script list in `AGENTS.md` and `.claude/skills/verify/SKILL.md` are covered by the standing yes of 2026-11-11 when a check changes.
- Don't invent a catalog export, layout, content layout, page type, flow state or rule input. Follow `proposals/README.md`. Import UI only from the product's catalog.
- The critique step's reviewer model is `reviewerModel` in `critique.config.json`.
- `gh` and the GitHub MCP tools are both fine.

## Subagent rules

- Don't open, push to, comment on, or mark a pull request, and don't watch one. The thread that started you does every write to the pull request.
- Commit on your own worktree branch and return. Don't reset or rewrite any other branch.
- Report your commit SHA, not a pull request link.

## Report

<!--
What to send back. A thread reports the pull request link or the branch, the tested commit, the verdict, and any
question only Ben can answer. A subagent reports its commit SHA, the commands it ran with their
results, and what it couldn't do, with the reason.
-->
```
