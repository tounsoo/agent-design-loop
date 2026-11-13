# Review: a page for each vendor

A vendor's name on its card on Vendors opens the vendor's page, `?route=vendors&vendor=<id>`: its remittance email, terms and open total, then its open invoices and its approved ones, each a link to the invoice. [Proposal 2026-11-12-vendor-page](../../../proposals/2026-11-12-vendor-page.md) added the `profile` page type, the first named under `shells.content`, and the `invoice-list` content layout, in the pull request that uses them.

## What the checks already decided

- Every addition is an addition, so `check:inventories` let the proposal be adopted in the pull request that adds it: `profile` joins `allowed_page_types` and `shells.content` with its chrome, Breadcrumbs and Heading, in `shells.chrome`, and `invoice-list` joins `allowed_content_layouts`. A designer's review of that pull request is the approval.
- The page's body is built from registered content layouts. The facts reuse `facts`, the same layout the invoice's facts use, and each list of invoices is one `invoice-list`. A first build put the tables straight in the feature and gave the page type a `Section` slot; once every page body had to come from content layouts, `check:inventories` failed that slot, and the table moved into `invoice-list`, which renders its own section heading.
- A content page holds no primary button, and `check:one-thing` holds the vendor page to that. Approve stays the product's only primary action, and the step budget for approving an invoice does not change.
- One `h1`, the vendor's name, and `h2` section headings under it: `check:rendered-page` reads the tags on every vendor scenario, at desktop and phone width. A section with no rows is left out, so no heading sits over an empty table.
- Nothing scrolls sideways on a phone. `check:rendered-page` caught the invoice table pushing the page wider on the first build; the table now scrolls inside its own frame.
- Five scenarios cover the page: open and approved invoices, changes requested, nothing open, no invoices at all with a 64-character name, and a vendor Meridian does not have, which opens Vendors. `check:accessible-names` holds each to what a screen reader hears, and `check:target-size` measures every link.
- Tests cover the vendor's open total, an invoice approved in the session moving to Approved, a breadcrumb back to the vendor from an invoice opened on its page, an added vendor's page title, and an unknown vendor falling back to Vendors.

## What the checks cannot decide

- The table on a phone. The page lets a long name or email break anywhere, and on the first screenshots that also split invoice numbers and amounts mid-word inside the tables. The critique called it a note; a second round keeps table words whole and lets the table scroll in its frame. On Harbor & Pine, whose Changes requested badge makes its Status column the widest, the Due column then sits partly behind the frame's edge until someone scrolls the table, and its dates wrap at their spaces. The second critique read that as the page scrolling sideways; `check:rendered-page` measured no sideways scroll, so it is the table's frame. Whether a phone should keep the table, stack each invoice, or keep each row on one line is a design call. No check reads a word broken mid-word.
- The facts sit close under the title and give the open total no more weight than the email. Whether the total should lead is a design call.
- Every vendor card name is now an underlined link, which the critique found louder than the cards were. Todae's link style is the same everywhere in Meridian.
- The breadcrumb's last item repeats the title, as it does on an invoice. The proposal says why both stay.
- A vendor with nothing open still shows an open total of $0.00. It is a fact, not an empty state, so it stays; whether to quiet it is a design call.
- The Amount column's `.num` class asks for numbers aligned to the end, and Todae's table cell styles win over it, so amounts sit at the start of their cells here as in the data table. That is a cascade question for the product stylesheet, not this page.
- Whether a clerk asks "what do we owe this vendor" often enough to earn a page is research. The proposal makes the case; nothing measures it.

## Critique

- Round 1, by Claude Sonnet, of the whole page: pass, with four notes, all above. [CRITIQUE.md](screenshots/meridian-vendor-page/CRITIQUE.md).
- Round 1 of the phone table change, by Claude Sonnet: pass, with two notes, both above. [CRITIQUE.md](screenshots/meridian-vendor-page-phone-table/CRITIQUE.md).

## Screenshots and the traces

- [Screenshots](screenshots/meridian-vendor-page/README.md) of Vendors, Vendor added and the five vendor scenarios in four views, with Vendors and Vendor added before the change.
- [Screenshots](screenshots/meridian-vendor-page-phone-table/README.md) of the three vendors with invoices on a phone, before and after the table change.
- The traces are `traces/meridian-vendor-page.jsonl`, which proposes, adopts, fails the checks once and passes, and `traces/meridian-vendor-page-phone-table.jsonl`, the second round.
