---
status: graduated
changes: []
---
# Proposal 0016: Hold what a screen reader hears to what each state declares

Decided, and graduated with its own pull request. Ben asked for this check on Nov 11, 2026, after Meridian's pull request 32 shipped a bug no check could see: after Approve, Todae's `Steps` read the waiting Payment stage as "In progress: Payment due Nov 18, 2026", and only one of three reviewers caught it. This adds a rule to `check:rules`. No inventory changes, so it lists no changes and graduates at once.

Rule or input: a new harness rule, `check:accessible-names`, and a file each flow keeps beside its views module, `accessible-names.ts`. No product input, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config changes.

- **What it opens.** The previews `check:target-size` opens: every modeled state, bare or once per query string the flow's `previews` lists. It builds and serves `paths.web` the same way, and the two checks now share that code.
- **What it reads.** Chrome's accessibility tree for the whole document, the tree a screen reader reads, through the DevTools protocol. A node's name is the accessible name Chrome computes. Its text is what its subtree reads: visually hidden runs included, `aria-hidden` ones left out. Its states are `aria-current`, disabled, expanded, checked, pressed and selected.
- **Declared.** `accessible-names.ts` exports `accessibleNames`, typed `satisfies AccessibleNames` from the harness package: each preview query mapped to what a screen reader should hear there, as a role with a name or a text and any states. Every preview needs at least one entry, and a key that is not a preview fails, so the declarations cannot fall behind the flow. Each entry must be in the tree.
- **Undeclared.** A node whose announcement depends on the state must be declared: one with `aria-current`, a `status`, `alert`, `log`, `timer` or `marquee` region or an element with `aria-live` polite or assertive, with something to say, or a `progressbar` or `meter`. A node with `aria-current` counts as declared only when its entry gives `current` too, so where the reader is cannot move without a diff. Pull request 32's list put `aria-current="step"` on the Payment stage, so the check would have asked its author to write that stage's announcement down, where "In progress" sits in front of the reviewer.
- **Named.** Every control in every preview has an accessible name: a button, link, field, option, tab, menu item, disclosure summary or image with none fails, whatever is declared.
- **Opt-out.** It is a rule in `check:rules`, so a product can opt out with a graduated proposal, as [proposal 0008](0008-rule-opt-out-and-retirement.md) describes.

## Reason

The other rules read code and layout. None reads what a screen reader says, so a component default that is wrong for a state, as "In progress" was for a stage that only waits, passes every check and depends on a reviewer noticing. A full snapshot of the tree would catch every change and make every change a diff to approve, so authors would regenerate it without reading it. Declaring only what changes between states keeps the file short enough to read, and the undeclared rule makes sure the parts that do change are in it. The declarations are written by the same author as the view, so they prove the build matches the spec, not that the spec is right. The spec sits in the pull request diff, per state, in the words a screen reader uses, which is where a reviewer can judge it.

## Preview

Pull request 32's list without its fix, built with Todae's `Steps` in `packages/harness/fixtures/illegal/step-read-as-in-progress`:

```
accessible names: ?state=invoice-approved: packages/harness/fixtures/illegal/step-read-as-in-progress/accessible-names.ts expects listitem reading "Next: Payment due Nov 18, 2026" (aria-current="step"), and a screen reader does not hear it. Its listitem nodes are "Done: Received", "Done: Approval", "In progress: Payment due Nov 18, 2026" (aria-current="step").
```

The same list with declarations that leave it out, in `illegal/undeclared-current-step`:

```
accessible names: ?state=invoice-approved: listitem reading "In progress: Payment due Nov 18, 2026" (aria-current="step") changes with the state, and packages/harness/fixtures/illegal/undeclared-current-step/accessible-names.ts does not declare it.
```

Meridian and Nook pass:

```
accessible names: 10 previews announce the 36 things their flows declare, and every control has a name.
accessible names: 7 previews announce the 20 things their flows declare, and every control has a name.
```

## Graduation

- No file changes on approval. These change in the same pull request:
  - `packages/harness/src/check-accessible-names.ts` and `packages/harness/src/lib/accessible-names.ts`, with Vitest tests, and `AccessibleNames` and `Announcement` exported from the harness package.
  - `packages/harness/src/lib/served-app.ts`, the build, serve and Chrome launch `check:target-size` and the new check share.
  - `check:accessible-names` in `package.json`, last in `check:rules`, so `check:product` and both CI jobs run it.
  - `accessible-names.ts` beside Meridian's and Nook's views modules, and the rule in Meridian's `uxRules`.
  - The fixtures `announced-progress`, `illegal/step-read-as-in-progress`, `illegal/undeclared-current-step`, `illegal/unnamed-control`, `illegal/undeclared-preview`, `illegal/stale-declaration` and `illegal/no-declarations`, and the docs: the harness README, `how-it-works.md`, `CLAUDE.md` and the verify skill.
- What the check cannot do: tell whether a declaration is the right thing to say, or whether a preview declares enough, since one entry satisfies it. It holds the build to the spec. It reads each preview as it loads, so a disclosure's closed contents and a live region's message before it arrives are not compared, and a state that should announce something but renders no live region passes, as Meridian's loading state does today. Roles are Chrome's names, such as `image` and `DisclosureTriangle`, from the build `npm run setup:chrome` pins. The tree does not say which text runs share a line, so `<b>In</b>voice` reads "In voice", and a declaration is written the way a failure message reads the page. Frames inside the page are not read.
