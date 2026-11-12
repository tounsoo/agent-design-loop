# Review: focus on a page change, and submits that keep focus

Until this change, 23 presses in Meridian changed what a screen reader could read and said nothing, or dropped focus to the page body, and `knownGaps` listed every one. Most were page changes: a nav link, a breadcrumb, a row's link, or Back to invoices. The app shell had a heading ref and an announcer, but a page type had to opt in with `usePageHeading`, and the announcer spoke only when the title changed, so going to the page already shown, or opening an invoice from a table whose link then vanished, was silent. Now the shell owns it, under [proposal 2026-11-12-shell-owned-focus](../../../proposals/2026-11-12-shell-owned-focus.md): when the URL's path or query changes, it moves focus to the h1 in `main`, and a screen reader reads the new page's title. A hash change, such as Skip to content, is no page change. A page with no h1 gets focus on `main` and an announcement of its title.

Approve and Request changes turn themselves off once used. They now use the catalog's `submitOff`, which sets `aria-disabled` instead of `disabled`, so the button keeps focus and the alert the page already shows says what happened. The loading body's hidden label is now a status region, and a load error is an alert.

## What the checks already decided

- `check:accessible-names` now passes 109 of 112 presses on their own. The other 3 are listed in `knownGaps`, each naming its issue: Try again drops focus while the page loads again ([issue 50](https://github.com/tounsoo/agent-design-loop/issues/50)), and Request changes reveals the reason field without moving focus there ([issue 51](https://github.com/tounsoo/agent-design-loop/issues/51)). A listed gap that stops happening fails the check, so the list only shrinks.
- The loading and error previews declare their status and alert, so the check fails if either goes quiet again.
- `submitOff` is a catalog export added under `adds`, which `check:inventories` accepts with the proposal this pull request adopts.

## What the checks cannot decide

- Whether moving focus to the h1 is the right place for every page. It reads the title first and starts Tab at the top of the content, which suits Meridian's pages; a page whose first job is a field might want focus there instead.
- Whether a page change into a loading page reads both the title and "Loading invoices", or only the title. Screen readers differ on a status region that appears with its text already in it, and the check cannot hear the difference.
- Whether the Preview menu should move focus. Switching a preview state changes the URL's query, so the shell treats it as a page change and moves focus to the h1. That is the preview tool, not a flow a person uses.

## Screenshots

The [screenshot gallery](screenshots/shell-owned-focus/README.md) shows the approved, changes-requested and error previews at 1280 by 900, before and after. They look the same: an `aria-disabled` button is drawn like a `disabled` one, and the alert's role does not change how it looks.
