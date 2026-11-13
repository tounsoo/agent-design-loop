---
status: adopted
changes: []
adds:
  - page-type:profile
---
# Meridian gets a page for each vendor

Meridian gains a third page type, `profile`: one record's facts and what belongs to it, with no primary action. Its first use is the vendor page, which opens from a vendor's card on Vendors and shows that vendor's payment details, open total, open invoices and approved invoices. It is the first page type in any product named under `shells.content`.

Rule or input: `allowed_page_types` gains `profile`, `products/meridian/page-types/profile/` holds its shell, `ProfilePage`, and `products/meridian/harness.config.ts` names it under a new `shells.content`. Every `shells` entry the base had stays as it is, so this only adds, and it is adopted in the pull request that adds it. No task, `max_steps`, priority, disclosure, cap, catalog export, layout, flow state or adapter field changes.

One registered content layout changes what it does: in `directory`, the Vendors body, each card's vendor name becomes a link to that vendor's page, so a card is now a way in as well as a summary. Its id, its place in `allowed_content_layouts` and its other parts stay as they are.

## Reason

Vendors lists every vendor as a card with four facts, and an invoice page names its vendor, but nothing in Meridian answers the question an accounts-payable clerk asks most about a vendor: what do we owe them, and what is still open. Today that means filtering All invoices by vendor in your head.

Why a new page type, not `detail`: `detail` is built around one primary action in its `Primary` slot, and `check:priority` and `lint:slots` hold every detail page to exactly one. A vendor page decides nothing; its actions are links to the invoices it lists. A detail page without a primary would fail those checks, and a fake primary would put a button on the page that does nothing a person came to do.

Why not `collection`: a collection lists many records of one kind, and its body is one registered content layout. A vendor page is one record, with its facts at the top and short lists below, each under its own heading.

Why `shells.content`: the config already has a kind for a page that shows information and holds no primary button, and `check:one-thing` already holds such a page to that. No product used it until now.

Why the shell owns the section headings: a `ProfilePage.Section` slot renders its own `h2` through the catalog's `Text`, so every section on a page of this type is a heading one level below the title, in Todae's own size for that level, and a page cannot skip a level or style a heading by hand. A product that wants another size for a level sets it through Todae's theme overrides, not on one page.

## States

- **Open and approved invoices:** Helios Freight. The facts say where remittance goes, the payment terms and the open total; Open invoices lists the one pending invoice with its status, due date and amount, and Approved lists the paid-out one, scenario `vendor-helios-freight`.
- **Open invoices with changes requested:** Harbor & Pine Catering. Both its invoices are open, one pending and one with changes requested, so the page shows Open invoices only, with each invoice's status, scenario `vendor-harbor-and-pine`.
- **Empty:** two cases. A vendor with nothing open, Kite Analytics, shows an open total of $0.00 and the Approved list, with no Open invoices heading over an empty list, scenario `vendor-nothing-open`. A vendor with no invoices at all says "No invoices from this vendor yet." under its facts, with no section headings, scenario `vendor-no-invoices`.
- **Loading:** Out of scope, vendors come with invoices in Meridian's one load, and a vendor link opened while it loads shows the Vendors page's own loading state, since the vendor page is on the Vendors route.
- **Error:** a link to a vendor Meridian does not have opens the Vendors page, with Vendors marked current, scenario `vendor-unknown`. A load error shows the Vendors page's own error, as Loading does.
- **Long content:** a vendor name of 64 characters wraps in the title and the breadcrumb, and a long remittance email breaks rather than pushing the page sideways on a phone, scenario `vendor-no-invoices`. The invoice tables keep four columns and scroll inside their own frame on a phone if they must.
- **Permissions:** Out of scope, Meridian has no roles, so everyone who can see Vendors can open a vendor.
- **Over time:** Out of scope, the sample due dates are fixed and nothing on the page changes while it is open. An invoice approved earlier in the session shows under Approved, and its amount leaves the open total, the next time the page opens; a test covers that.

## Preview

The vendor page at `?route=vendors&vendor=helios-freight`:

- Breadcrumbs: Vendors, then the vendor's name.
- The title: the vendor's name, `h1`, which the app shell focuses on arrival.
- Facts in one horizontal list: Remittance (the email), Terms (Net 45) and Open total ($12,640.50).
- A section Open invoices: a table of Invoice (a link to the invoice), Status, Amount and Due, soonest due first. An invoice opened from it has the breadcrumbs Vendors, the vendor, then the invoice number.
- A section Approved: the same table without Status, latest due first.
- No buttons on the page.

On Vendors, each card's vendor name becomes a link to its vendor page. Vendors stays the current place in the navigation on a vendor page.

Shown twice: the vendor's name is the breadcrumb's current item and the title, as on the invoice page. The breadcrumb stays because it says where the page sits; the title stays because it is what focus lands on. The open total is a sum the table does not show, so it is not a repeat. Each invoice's vendor is not a column, since every row has the same one.

The line `check:inventories` prints on the pull request that adds it:

```
inventory: products/meridian/harness.config.ts shells adds profile, the page type this change adds: profile joins shells.content: no primary action.
```

## Adoption

`products/meridian/inputs/product.ts` adds `profile` to `allowed_page_types`; `products/meridian/page-types/profile/` holds `ProfilePage` with `Breadcrumbs`, `Heading`, `Meta`, `Body` and `Section`; `page-types/index.ts` exports it; `harness.config.ts` names it under `shells.content`. The flow gains the `vendor` screen, read from `?vendor=` on the Vendors route, and five scenarios; the sample vendors gain one with a long name and no invoices. `features/invoice-approval/views.tsx` renders the page, `content-layouts/directory` links each card's name to it, `App.tsx` titles the document with the vendor's name, and `accessible-names.ts` declares what a screen reader hears on each new scenario. A review note, `products/meridian/review/vendor-page.md`, records what the checks leave open.
