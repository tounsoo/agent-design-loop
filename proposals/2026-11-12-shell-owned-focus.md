---
status: adopted
changes: []
adds:
  - submitOff
---
# The shell owns focus on a page change, submits keep focus, and every known gap names its fix

Adopted in the pull request that adds it, because it only adds a member to the catalog exports ([proposal 0012](0012-additions-in-one-pull-request.md)). A designer's review of that pull request is its approval. Item 3 of the Nov 12 harness eval, which Ben asked to run.

Inventory: Meridian's catalog, `products/meridian/catalog/index.ts`, and Nook's, `products/nook/catalog/index.ts`, each gain `submitOff`, a product-owned helper in the catalog folder beside the index (`catalog/submit.ts`). No layout, content layout, page type, flow state, rule input, config or adapter changes.

Rule or input: each flow's `knownGaps` entry gains a required `fixIn`, checked by `check:accessible-names` with or without Chrome. No rule cap changes.

- **Page changes.** Meridian's app shell and Nook's top bar move focus to the new page's h1 whenever the page changes, so a screen reader reads the new page's title. A page no longer opts in: the shell finds the h1 in `main` itself, and Meridian's `usePageHeading` hook goes. Meridian's page is its URL, without the hash, so the skip link is no page change. Nook has no URL, so its top bar takes a required `page` prop that names the page shown: `rooms`, `waitlist` or `room:<id>`. The first page keeps the browser's own focus, and a change inside one page, such as a retry, a reveal or a submit, keeps its own. A page with no h1 gets focus on `main`, and Meridian's shell announces its title then.
- **Submits.** `submitOff(off)` returns `aria-disabled` for a submit button that turns itself off once used, or while its request is busy, and nothing otherwise: `<Button.Root {...submitOff(!canAct)}>`. A `disabled` button drops the focus it holds to the page body. An `aria-disabled` one keeps focus and reads as turned off, and Todae's Button ignores presses on it. The result is said by the status region the page already has. Meridian's Approve and Request changes, and Nook's Hold room and Book room, use it.
- **Known gaps name their fix.** A `knownGaps` entry without `fixIn`, the GitHub issue or pull request URL or the proposal file its fix waits on, fails, and so does a proposal path that does not exist. A gap can no longer wait on nothing.
- **Meridian's load states are named.** The loading body's hidden label is a `status` region ("Loading invoices"), and a load error is an `alert`. Both are declared in `accessible-names.ts`. The status region appears with its words already in it, which screen readers do not all read, so on a page change the h1's title is what is sure to be heard.

## Reason

`check:accessible-names` found 44 presses across Meridian and Nook that change the page silently or drop focus (23 and 21). They come down to four patterns, and two of them make up 40: a page change that moves neither focus nor an announcement (34), and a submit that turns itself off and drops focus (6). Both belong to code every page shares. Meridian's shell already had a heading ref and an announcer, but the announcer spoke only when the title changed, so going to the page already shown, or opening an invoice from a table whose link vanished, said nothing; and a page type had to opt in with a hook. Owning it in the shell fixes every current page and every page added later.

The eval suggested announcing on every page change as well as moving focus. This does one or the other, not both: focus on the h1 already makes a screen reader read the title, and an announcement on top would read it twice. The announcement stays only for a page with no h1. Likewise the submit keeps focus on its button and lets the status region speak, rather than moving focus to the status: focus on a live region reads its text a second time.

The other two patterns change one page in place, so no shell can own them: Try again replaces itself with the loading state (both products, issue 50), and Request changes reveals the reason field without moving focus (Meridian, issue 51). They stay listed, each naming its issue.

## States

- **Page change:** focus moves to the new page's h1, and a screen reader reads its title.
- **First page:** focus stays where the browser puts it; nothing is moved or announced on load.
- **Same page:** a retry, reveal or submit keeps its own focus; a hash change, such as the skip link, is not a page change. Meridian's Preview menu changes the URL's query, so switching a preview state counts as a page change and moves focus to the h1.
- **Submitted:** the button reads as turned off and keeps focus; the page's status region says what happened, such as "Invoice approved" or "Room booked".
- **Empty:** Out of scope, the shell and the submit pattern change no empty state; Meridian's and Nook's empty pages are pages like any other.
- **Loading:** Meridian's loading body says "Loading invoices" or "Loading vendors" in a status region; a submit that waits on a request stays `aria-disabled` while busy.
- **Error:** Meridian's load error is an alert. Try again still drops focus, listed under issue 50.
- **Long content:** Out of scope, focus goes to the h1 at the top of the page however long the page is.
- **Permissions:** Out of scope, neither product has sign-in or roles.
- **Over time:** Nook's hold ending changes the page in place, so focus stays where it was and the status region says the hold ended.

## Preview

```
accessible names: 11 previews announce the 61 things their flows declare, and every control has a name. 109 of 112 presses tell a screen reader what changed and keep focus on the page, and the other 3 have problems their flows list in knownGaps.
accessible names: 11 previews announce the 56 things their flows declare, and every control has a name. 34 of 35 presses tell a screen reader what changed and keep focus on the page, and the other 1 has a problem its flow lists in knownGaps.
```

Before, on main: 89 of 112 with 23 listed, and 14 of 35 with 21 listed.

## Adoption

- `products/meridian/layouts/app-shell/AppShell.tsx` and `products/nook/layouts/top-bar/TopBar.tsx` own focus on a page change; the page types' h1s keep `tabIndex={-1}`, and Meridian's `usePageHeading` is gone.
- `products/meridian/catalog/submit.ts` and `products/nook/catalog/submit.ts` add `submitOff`, exported from each catalog's index.
- `knownGaps` in both products' `accessible-names.ts` shrink to the retry and reveal entries, each with `fixIn`.
- `packages/harness/src/lib/presses.ts` requires `fixIn`, with Vitest tests, the `illegal/untracked-press-gap` fixture case, and `fixIn` in `listed-press-gap` and `illegal/stale-press-gap`.
- `CLAUDE.md`, the verify skill, the harness README and `how-it-works.md` say so.
