import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "On every preview, what a screen reader hears matches the flow's `accessible-names.ts`, and every press either announces what changed or moves focus.",
  flags: [{ name: "--list", what: "Checks the file against the previews, without building or Chrome." }],
  fails: [
    "A control with no accessible name.",
    "An announcement the flow's `accessible-names.ts` declares for a preview that a screen reader does not hear there, compared by role, by name or text, and by every state the entry gives.",
    "A node the file leaves out whose announcement changes with the state: one with `aria-current`, which counts as declared only when its entry gives `current`; a live region, by role (`status`, `alert`, `log`, `timer`, `marquee`) or `aria-live` polite or assertive, with something to say; or a progress bar or meter.",
    "A missing file, a preview the file declares nothing for, or a key that is not a preview, with or without Chrome.",
    "A press that changes what a screen reader could read while no live region says anything new, focus stays put and the control's own expanded, checked, pressed or selected state stays the same.",
    "A press after which focus is on the page body, whatever was said.",
    "An action the check cannot focus, one that moves focus elsewhere when focused, and a preview that does not render the same actions on every load, so an action cannot be pressed on its own.",
    "An `accessible-names.ts` that does not load, a malformed `knownGaps` entry, and a `previews` entry that cannot be listed.",
    "A `knownGaps` entry whose press no longer has its problem on a preview it names, so the list only shrinks.",
    "A `knownGaps` entry with no `fixIn`, or one that is neither a GitHub issue or pull request URL nor the path of a proposal file that exists, with or without Chrome, so no gap waits on nothing.",
  ],
  details: [
    "It builds and serves the app as `check:target-size` does and opens the same previews. On each it reads the whole document's accessibility tree, the one a screen reader reads, through the DevTools protocol: each node's role, its accessible name, the text its subtree reads with `aria-hidden` runs left out, and `aria-current`, disabled, expanded, checked, pressed and selected. Chrome's tree does not carry `aria-current`, so it reads that from the element. Roles are Chrome's names, such as `image` and `DisclosureTriangle`. A node's text is its runs joined by a space, so write it the way a failure message prints it. Frames inside the page are not read.",
    "Beside each flow's `views` module, `accessible-names.ts` exports `accessibleNames` (`satisfies AccessibleNames`): each preview mapped to what a screen reader should hear there. Declare what changes between states, not the whole tree. It reads each preview as it loads, so it does not open disclosures or wait for a live region to fill, and a state that should announce itself and renders no live region at all passes. [Proposal 2026-11-11-accessible-names-per-state](../../../proposals/2026-11-11-accessible-names-per-state.md) records the rule.",
    "Then it presses every action. On each preview, from a fresh load with the origin's storage cleared, it focuses each enabled button, link, disclosure summary, menu item, tab, checkbox, radio or switch, checks that focus stayed on it, presses Enter, or Space for a checkbox, radio, switch, or checkbox or radio menu item, and reads the page 150 ms later, past the 100 ms Todae's announcer waits before it writes (inside an open Todae modal it writes later, which the check does not wait for). A new name on the focused control is not enough, and neither is a status region added with its words already in it, since screen readers do not reliably read either. A press that loads another document is skipped and not counted, and a dialog a press opens is dismissed.",
    "Problems a product has not fixed yet go in the same file's `knownGaps` (`satisfies KnownGaps`), as `{ presses: ['button \"Try again\"'], problem: \"focus lost\", previews: [\"state=error\"], why, fixIn }`, where `fixIn` is the issue, pull request or proposal its fix waits on. Leaving `previews` out covers every preview, later ones included. A listed problem passes, and the check's last line counts them. [Proposal 2026-11-12-press-every-action](../../../proposals/2026-11-12-press-every-action.md) records the pass and what it cannot see, and [proposal 2026-11-12-shell-owned-focus](../../../proposals/2026-11-12-shell-owned-focus.md) adds `fixIn`.",
    "Two patterns are fixed where every page shares them, so a page that uses them needs no listing, and the press check still catches one that does not: each product's shell moves focus to the new page's h1 on a page change, and a submit that turns itself off takes the catalog's `submitOff`, `aria-disabled` rather than `disabled`, so it keeps focus.",
  ],
} satisfies CheckMeta;
