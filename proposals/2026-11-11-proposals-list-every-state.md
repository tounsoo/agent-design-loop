---
status: graduated
changes: []
---
# Proposals list every state before building

Decided, and graduated with its own pull request. Ben asked for it after the Meridian demo in pull request 32 raised two design questions only once the screen was built: an approved invoice past its due date showed no sign of it, and the new progress list repeated the status row above it. Both were visible in the proposal's terms before the build, had anyone listed the states. No inventory changes, so it lists no changes and graduates at once.

Rule or input: the proposal format, and what `check:proposals` reads. No product input, `max_steps`, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config changes. `check:rules` does not change, so no product can opt out of anything new.

- **The section.** A proposal that lists anything under `changes` or `adds` has a `## States` section of `- <state>: <what the screen shows>` items. It names at least one ordinary state and each edge case: Empty, Loading, Error, Long content, Permissions and Over time. An edge case the change cannot reach is written `Out of scope, <why>`. A change that shows on no screen writes the one item `- None: <why>`.
- **When it is required.** From a proposal the change adds, whatever status it starts at, and from one it moves from `open` to `decided`. Proposals already on the base keep their text: an open request gains its states when it is approved, and one already decided or graduated is never asked. A decided or graduated proposal that has the section keeps it, because the states are part of what was approved. Proposals that change no member, such as harness changes and opt-outs, need none.
- **What the check reads.** The names, not the words. Any item that is not an edge case counts as an ordinary state. A missing edge case, a state with no text, an out-of-scope item with no reason, a list of only edge cases and `None` beside other states each fail. Whether the text is right is the designer's to judge, as with the Preview.
- **The prompt.** The design loop's `propose` node and `AGENTS.md` ask for the states, and for information the screen would show twice, before building. The verify skill asks to open each listed state once the screen is built.

## Reason

A designer approves a proposal from its Reason and Preview. Both show the screen the agent had in mind, usually its ordinary state, so the cases nobody drew pass review unseen and turn up in the build or after it. Pull request 32 showed both kinds: a state that only appears as time passes, and two parts of one screen saying the same thing. Asking for named edge cases puts each one in front of the reviewer as a line to read or a reason to accept. The check pins the names because a free list would pass with one line, which is how the demo's proposal read. It reads nothing of the text, so a wrong description still needs a reviewer.

Requiring the section of every proposal on main that lists changes would mean backfilling four files, three of which are graduated records of changes already built, which cannot gain anything from it. Reading it at approval keeps that churn at zero and still covers every request before its build starts.

## Preview

`check:proposals` on a new proposal that adds a catalog export and lists only its ordinary state:

```
proposals: compared with 1caa889:
- proposals/2026-11-12-steps.md "## States" has no "Empty" item. Say what the screen shows, or write "- Empty: Out of scope, <why>".
- proposals/2026-11-12-steps.md "## States" has no "Loading" item. Say what the screen shows, or write "- Loading: Out of scope, <why>".
- proposals/2026-11-12-steps.md "## States" has no "Error" item. Say what the screen shows, or write "- Error: Out of scope, <why>".
- proposals/2026-11-12-steps.md "## States" has no "Long content" item. Say what the screen shows, or write "- Long content: Out of scope, <why>".
- proposals/2026-11-12-steps.md "## States" has no "Permissions" item. Say what the screen shows, or write "- Permissions: Out of scope, <why>".
- proposals/2026-11-12-steps.md "## States" has no "Over time" item. Say what the screen shows, or write "- Over time: Out of scope, <why>".
```

The same proposal with no `## States` section at all:

```
proposals: compared with 1caa889:
- proposals/2026-11-12-steps.md is new and adds Steps, but has no "## States" section. List every state the change shows before it is built, the edge cases Empty, Loading, Error, Long content, Permissions, Over time included, or "- None: <why>" when it shows on no screen.
```

## Graduation

In the pull request that adds this proposal: `packages/harness/src/lib/proposals.ts` reads `## States` and requires it, with Vitest cases in `proposals.test.ts`; `proposals/README.md` gives the format; `AGENTS.md`, the `propose` node in `packages/harness/design-loop.ts` and the verify skill ask for the states before building and check them after; `CLAUDE.md`, the harness README and `packages/harness/docs/how-it-works.md` describe the check.
