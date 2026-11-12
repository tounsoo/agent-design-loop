# Review: adding a vendor

Vendors is a directory of cards with an **Add a vendor** form behind the page's one disclosure. [Proposal 2026-11-12-vendor-directory](../../../proposals/2026-11-12-vendor-directory.md) added the `directory` content layout, the `vendor-added` flow state, and `Card`, `Description`, `Form` and `Grid` to the catalog, in the pull request that uses them.

## What the checks already decided

- The additions are only additions, so `check:inventories` let the proposal be adopted in the pull request that adds it. A designer's review of that pull request is the approval.
- Vendors is its own `CollectionPage` element, so its caps count on their own. Its one visible question is the search. Vendor name, Remittance email and Payment terms are written inside `Disclosure.Root` in `Directory.tsx`, so `check:one-thing` counts them as disclosed. "Add a vendor" is the page's one disclosure, at depth 1.
- Add vendor, Clear search and Add "{search}" are secondary, so the collection page holds no primary and Approve stays the product's only primary action.
- `vendor-added` has a view, and its bare preview, `?state=vendor-added`, opens Vendors. `check:target-size` measures its controls, and `check:accessible-names` holds it to the confirmation "Added Ridgeway Janitorial.", the open disclosure, the three fields and the new vendor's card.
- `add-vendor` is a user event of the flow, so the step budget explores it, and no route to `invoice-approved` grows: the longest is still open an invoice, then Approve.
- The validation rules and their copy are one function, `checkVendorDraft`. Tests cover an empty form, a duplicate in any spacing or case, a bad email, an 80-character cap and unknown terms, and a journey that fails each before it adds a vendor and hears the confirmation.

## What the checks cannot decide

- Does the form belong behind a disclosure? The cap of one visible question puts it there. Whether people find "Add a vendor" where it is, and whether the one-question rule should count a form whose fields answer one request, is research, not a check.
- Should "Add a vendor" join `disclosed_sections`? `check:priority` requires the listed sections to exist and does not fail one that is not listed. Adding it is a rule input, so it takes a proposal decided on the base.
- Should adding a vendor be a task with a `max_steps`? Opening the disclosure, typing a name and an email, then Add vendor is four actions. No task names it, so nothing measures it. That is a rule input too.
- Is `vendor-added` right in the invoice-approval flow? It is there because a new modeled state gets a preview without a config change. A `vendors` flow with its own previews would be cleaner, and would change `harness.config.ts`, so it takes two pull requests.
- Is the duplicate check strict enough? It matches names after trimming, collapsing spaces and ignoring case. "Northwind Office Supply Inc." passes beside "Northwind Office Supply". Search-then-add is the other defence, and the reviewer decides whether that is enough.
- Should the email check match the browser's? The field is a text input with an email keyboard, so the message is the product's and not the browser's. The rule asks for a dot in the domain, which the browser's email grammar does not.
- The summary and the field each show a problem after a failed submit, and the confirmation and the new card both name the vendor. The proposal says why both stay. Whether that reads as repetition is a design call.
- Should a card link to its last invoice? The table that came before had no link, and this change keeps it that way. A link under the form also fails `check:target-size`, which measures one frame after it opens a disclosure, while the disclosure's open transition still has the form laid over the cards.
- Added vendors last until the page reloads, because there is no backend. Whether a vendor should need a second person's approval before invoices can be paid to it is a product question this demo does not model.
