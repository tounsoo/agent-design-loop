# The vendor page

Each vendor has a page of its own, a `profile` page: the vendor's facts (remittance email, payment terms and open total), then its invoices in two lists, Open invoices and Approved, each invoice a link to its detail page. It shows information and holds no button. A list with no invoices is left out, a vendor with none says so, and a link to a vendor Meridian does not have opens Vendors instead.

## Sub-features

- `vendor-open` opens a vendor's page from its card on Vendors, titled with the vendor in the heading and the document title.
- `vendor-lists` shows Open invoices and Approved, and leaves out a list with nothing in it.
- `vendor-none` says `No invoices from this vendor yet.` for a vendor with no invoices, a vendor added in the session included.
- `vendor-unknown` opens Vendors for a vendor id Meridian does not have.
- `vendor-back` leads an invoice opened from the page back to that vendor in its breadcrumbs.
- `vendor-no-primary` keeps every button off the page.

## How to get to it (user POV)

- On Vendors, choose a vendor's name on its card, such as `Helios Freight`.
- Open `?route=vendors&vendor=helios-freight`, or `?scenario=vendor-helios-freight` from the Preview menu.

## Driving it with Vitest, the rule checks and a browser

Preconditions:

- The baseline preconditions hold, and Meridian is on Vendors (`?route=vendors`).

- **Open.** Choose `Helios Freight` on its card. Run `npx vitest run -t "opens a vendor's page from its card, with its facts and invoices and no button"`. The h1 reads `Helios Freight`, the facts show `Net 45` and an open total of `$12,640.50`, the `Open invoices` table links `INV-1907`, the `Approved` table links `INV-1694`, and the page has no button.
- **Title.** Run `npx vitest run -t "titles a vendor's page with its vendor, an added vendor included"` and `npx vitest run -t "opens a vendor's page from its card in the Vendor added preview, titled as the page"`. The h1 has focus and the document title starts with the vendor's name.
- **Empty lists and unknown vendors.** Open `?scenario=vendor-nothing-open`, `?scenario=vendor-no-invoices` and `?scenario=vendor-unknown`. Run `npx vitest run -t "leaves out an empty section, says when a vendor has no invoices, and opens Vendors for an unknown vendor"` and `npx vitest run -t "titles a link to a vendor Meridian does not have as Vendors, the page it opens"`. The first has no Open invoices heading but an Approved one, the second says `No invoices from this vendor yet.` with no h2, and the third is Vendors with `9 vendors`.
- **Back to the vendor.** Run `npx vitest run -t "leads an invoice opened from a vendor's page back to that vendor"` and `npx vitest run -t "shows an invoice approved in the session under Approved the next time the vendor's page opens"`. The invoice's breadcrumbs lead back to the vendor, and an invoice approved there moves to Approved with an open total of `$0.00`.
- **Added in the session.** Run `npx vitest run -t "opens the page of a vendor added in the session"`. The new vendor's page says `No invoices from this vendor yet.`
- **No primary.** Run `npm run check:one-thing -- --config products/meridian/harness.config.ts`. It prints `no primary on a collection or content page` over all 4 pages.
- **Browser.** Open `?scenario=vendor-helios-freight` and `?scenario=vendor-harbor-and-pine` in the preview. Each shows the vendor's facts and its invoice lists inside the shell. Harbor & Pine Catering has only open invoices, one with changes requested, so its page shows Open invoices with each invoice's status and no Approved list.

## Gotchas

- `profile` is a content page type in the config's `shells.content`, with the breadcrumbs and the heading as its chrome in `shells.chrome`. Its body is the `facts` and `invoice-list` content layouts, so a new block on it is a new content layout with its proposal.
- The vendor id is read only on the Vendors route: `?vendor=helios-freight` alone opens To approve (`npx vitest run -t "reads a vendor only on the Vendors route"`).
- A vendor's card link leaves a preview, so a vendor opened from the Vendor added preview is the live app's.
- [Proposal 2026-11-12-vendor-page](../../../../../proposals/2026-11-12-vendor-page.md) records the page.

## Covers

- Page types: `profile`
- Content layouts: `facts`, `invoice-list`
- Scenarios: `?scenario=vendor-helios-freight`, `?scenario=vendor-harbor-and-pine`, `?scenario=vendor-nothing-open`, `?scenario=vendor-no-invoices`, `?scenario=vendor-unknown`
