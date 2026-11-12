---
status: adopted
changes: []
---
# Press every action, and fail a press that tells a screen reader nothing

Ben asked for this on Nov 12, 2026, after the retro on pull request 42, Nook's Waitlist page. Two of its bugs passed every check, and only the internal review caught them: focus fell to the page when a row's button changed, and leaving a waitlist while a room was free announced nothing. Both show only after a press, and `check:accessible-names` read each preview as it loads. This widens that rule. No inventory changes, so it lists no changes and is adopted with its own pull request.

Rule or input: `check:accessible-names` gains a second pass, and each flow's `accessible-names.ts` may export `knownGaps`. No product input, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config changes.

- **What it presses.** On every preview, each enabled control a person presses, as Chrome's accessibility tree has it: a button, link, disclosure summary, menu item, tab, checkbox, radio or switch. Fields, selects and sliders take input, not a press, so they are left out. Each press starts from a fresh load of the preview, so one press cannot cause or hide another's problem. It focuses the control, presses Enter (Space for a checkbox, radio or switch), and waits two frames for the page to settle.
- **Silent.** A press that changes what a screen reader could read (any node's role, name, text or state) must say so in one of three ways: a live region on the page before the press says something new, or an alert appears with something to say; focus moves to another element; or focus stays on the control and its own expanded, checked, pressed or selected state changes. A new name on the focused control does not count, since screen readers do not reliably read a name change out, and neither does a status region added with its words already in it.
- **Focus lost.** A press after which focus is on the page body fails, whatever a live region said, since the reader then starts again from the top. The message says whether the press removed the control, hid it or turned it off.
- **Known gaps.** `knownGaps`, typed `satisfies KnownGaps`, lists press problems a product has not fixed yet: each entry names the presses as a failure prints them, such as `button "Try again"`, the problem, `"silent"` or `"focus lost"`, optionally the previews, and why it waits. A listed problem passes and is counted in the check's last line. An entry whose press no longer has its problem fails, so the list only shrinks as fixes land.
- **What it skips.** A press that loads another document, which a screen reader reads from the top. A control a keyboard cannot focus fails instead.

## Reason

A state as it loads says nothing about what happens when a person acts on it, and acting is where both of pull request 42's misses were. Declaring every press would make the declarations file a script nobody reads, so the rule asks nothing of the author: it presses everything and holds each press to the one thing a screen reader needs, that a change is told. Focus loss is its own failure because a live region does not undo it.

The first run on main found that most presses in both products change the page silently or drop focus: the navigation, opening an invoice or a room, sorting and paging Meridian's tables, the buttons that turn themselves off, and Try again. None of those fixes is small, and each changes a product other pull requests are changing now. Failing main until all of them land would block every pull request, and leaving them out of the rule would hide them. `knownGaps` lists each one beside its declarations with what fixes it, in the pull request where a reviewer reads them, and the check fails an entry once its fix lands.

## Preview

Pull request 42's rows before their fix, in `packages/harness/fixtures/illegal/waitlist-row-loses-focus`:

```
accessible names: ?state=waitlist: pressing button "Join waitlist for Cedar" removes it from the page, and focus falls to the page body, so a screen reader starts again from the top. Keep focus on the same element, or move it to what replaced it.
```

After its first fix and before its second, in `illegal/silent-waitlist-leave`:

```
accessible names: ?state=freed: pressing button "Leave waitlist for Birch" changes the page, and a screen reader hears nothing: no live region says anything new, focus stays where it was, and the control's own state does not change. It now has listitem reading "Birch Join waitlist", button "Join waitlist for Birch". Say it in a status region that is on the page before the press, or move focus to what changed.
```

Meridian and Nook pass with their known gaps listed:

```
accessible names: 10 previews announce the 48 things their flows declare, and every control has a name. 45 of 110 presses tell a screen reader what changed and keep focus on the page, besides 65 known gaps their flows list in knownGaps.
accessible names: 8 previews announce the 24 things their flows declare, and every control has a name. 4 of 14 presses tell a screen reader what changed and keep focus on the page, besides 10 known gaps their flows list in knownGaps.
```

## Adoption

- No file changes on approval. These change in the same pull request:
  - `packages/harness/src/lib/presses.ts`, with Vitest tests, `packages/harness/src/check-accessible-names.ts`, and `AxNode` in `packages/harness/src/lib/accessible-names.ts`, which now carries the element's backend id. `KnownGap` and `KnownGaps` are exported from the harness package.
  - `knownGaps` in Meridian's and Nook's `accessible-names.ts`.
  - The fixtures `announced-waitlist`, `listed-press-gap`, `illegal/waitlist-row-loses-focus`, `illegal/silent-waitlist-leave` and `illegal/stale-press-gap`, and the docs: the harness README, `how-it-works.md`, `CLAUDE.md` and the verify skill.
- What the check cannot do: tell whether what a live region says is the right news, or whether focus moved to the right place, only that the change was told. It presses each action once, from the preview as it loads, so a second press, a sequence, or an action that only shows after another press (inside a closed menu, say) is not pressed. Typing into a field and choosing from a select are not pressed. It waits two frames after a press, so news that arrives later, from a timer or the network, is not read. It runs in Chrome, so it holds products to how Chrome moves focus, such as to the page body when a focused button turns itself off.
