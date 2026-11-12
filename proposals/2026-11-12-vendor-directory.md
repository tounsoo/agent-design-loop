---
status: adopted
changes: []
adds:
  - Card
  - Description
  - Form
  - Grid
  - directory
  - vendor-added
---
# Add vendors from a vendor directory

Adopted in the pull request that adds it, because it only adds members to inventory lists ([proposal 0012](0012-additions-in-one-pull-request.md)). A designer's review of that pull request is its approval.

Inventory: Meridian's component catalog, `products/meridian/catalog/index.ts`, gains Todae's `Card`, `Description`, `Form` and `Grid`. `allowed_content_layouts` in `products/meridian/inputs/product.ts` gains `directory`, with its directory under `products/meridian/content-layouts/`. The invoice-approval flow's `modeledStates` gains `vendor-added`. No layout, page type, rule input, config or adapter changes, and Nook does not change.

## Reason

Vendors is a read-only list built from invoices: a vendor exists only once it has billed Meridian. Accounts payable sets a vendor up before the first invoice comes, because the remittance email and the payment terms decide where advice goes and when the invoice falls due. There is nowhere to do that.

A form needs parts the catalog does not have. `Form` checks the fields before it submits, moves focus to its summary and shows each problem under its field, so the validation copy stays the product's while the behaviour stays Todae's. `Description` is the hint under the email field. A vendor's facts read better as a card each than as table columns, once each vendor carries an email and terms: `Card` is the surface and `Grid` lays the cards out as wide as the page allows.

The data table cannot take the form. The page's one visible question is its search, so the three fields have to sit inside the page's one disclosure, and the data table's search, facets, sort and paging are an invoice queue's tools. That makes a new content layout, `directory`: one search field, one "Add a vendor" disclosure that holds the whole form, and a grid of cards with a list of facts each. Vendors also gets its own collection page in the views, so its question and disclosure count against its own page, and the data table stops serving vendors.

The flow gains `vendor-added`, the state after a vendor is added, on purpose. The harness opens a preview for every modeled state that `flows[].previews` does not list, so a new state gets a preview, screenshots and an accessible-names gate on its confirmation without touching `harness.config.ts`, which would take a second pull request. The state carries its route, Vendors, so its bare preview opens the right page. Adding a vendor is a person's event, `add-vendor`, so the task graph's user events list it, as their coverage type requires. No task names it, so the approval task's step budget does not count it.

Nothing here adds a primary button: Add vendor is secondary, and a collection page holds no primary.

## States

- **Browsing:** the search field, a count such as "8 vendors", the closed "Add a vendor" disclosure, and one card per vendor in name order, each with its remittance email, payment terms, open invoices and its latest invoice as a link.
- **Adding:** the disclosure is open on an empty form, with Net 30 chosen.
- **Invalid:** a failed submit moves focus to the form's summary, which lists each problem as a link to its field, and each field shows its own message under it. The messages are "Enter the vendor's name.", "Use 80 characters or fewer.", "Enter the email that gets remittance advice." and "Enter an email like ap@vendor.com.".
- **Duplicate:** a name already on the list, whatever its spacing or case, reads "Northwind Office Supply is already a vendor.", in the list's spelling.
- **Vendor added:** the confirmation says "Added Ridgeway Janitorial.", the form clears and stays open with focus back on Vendor name, and the vendor's card takes its place in name order, with no open invoices and "No invoices yet".
- **No search match:** "No vendors found", with Clear search and Add "{search}", which opens the form with the name filled in.
- **Empty:** the directory shows "No vendors yet" in place of the cards, with the form open, since adding is the only next step. It is the directory's own empty state, not the collection shell's, because the form is in the directory. `?state=empty&route=vendors` shows it; the empty preview the checks open is To approve's.
- **Loading:** the collection shell's loader, "Loading vendors", with no form, because the duplicate check needs the registry.
- **Error:** the collection shell's alert and Try again, with no form, for the same reason.
- **Long content:** a long name wraps in its card's heading, and a long email breaks anywhere inside its card. Nothing truncates, because people copy these values. A long list grows the page under the search. There is no paging, so a vendor just added is never on a page out of view.
- **Permissions:** Out of scope, Meridian has no sign-in or roles, so everyone who opens Vendors may add one.
- **Over time:** an added vendor lasts until the page reloads, because there is no backend. The confirmation lasts until the person leaves Vendors, or the next add replaces it. A card's latest invoice shows its due date, not a countdown.

## Preview

Vendors at 1280 px, ready:

```
Vendors
Vendors Meridian pays.

[ Search vendors ______________ ]   8 vendors

▸ Add a vendor

┌ Brightline Paper Co ──────┐ ┌ Fieldnote Print ──────────┐ ┌ Harbor & Pine Catering ┐
│ Remittance  ap@bright…    │ │ Remittance  billing@field…│ │ …                      │
│ Terms       Net 30        │ │ Terms       Net 15        │ │                        │
│ Open        1             │ │ Open        1             │ │                        │
│ Last invoice INV-1914     │ │ Last invoice INV-1855     │ │                        │
└───────────────────────────┘ └───────────────────────────┘ └────────────────────────┘
```

Opened, the disclosure holds the confirmation region, the form's summary after a failed submit, Vendor name, Remittance email with the hint "Where remittance advice goes.", Payment terms, and a secondary Add vendor button. The `vendor-added` preview shows it open after Ridgeway Janitorial was added.

What the screen would show twice, and which copy stays:

- After a failed submit, each problem is in the summary and under its field. Both stay: the summary takes focus and says how many problems there are, and the message under the field sits where the fix happens. That is how Todae's `Form` works.
- The confirmation names the vendor, and so does the new card. Both stay: the confirmation is the event and the card is the record. A "New" badge on the card would say it a third time, so there is none.
- Vendors' description was written twice, in the navigation and in the data table's copy. It now lives in the navigation alone, and reads "Vendors Meridian pays.", because "Vendors with invoices in Meridian." is false once a vendor can have none.
- The data table's "Open invoices" facet restated the open count. The facet goes, and the count stays on the card.

The happy path is open Vendors, open "Add a vendor", fill the three fields, then Add vendor. The approval task does not change.

## Adoption

- `products/meridian/catalog/index.ts` exports `Card`, `Description`, `Form` and `Grid` from `@tounsoo/todae`.
- `products/meridian/inputs/product.ts` adds `directory` to `allowed_content_layouts`, and `products/meridian/content-layouts/directory/` holds the layout.
- `products/meridian/flows/invoice-approval/states.ts` adds `vendor-added` to `modeledStates`, its `FlowState` and the `add-vendor` event. `transition.ts`, `location.ts` and `graph.ts` handle them, and `vendors.ts` holds the vendor registry, the validation rules and their copy.
- `products/meridian/preview/readState.ts` gives `vendor-added` its route, and the preview menu links to it.
- `products/meridian/features/invoice-approval/views.tsx` renders Vendors as its own collection page on the directory, and `InvoiceApproval.tsx` keeps the registry beside the ledger. `content-layouts/data-table` no longer serves vendors.
- `products/meridian/features/invoice-approval/accessible-names.ts` declares what Vendors and the `vendor-added` preview announce.
- `products/meridian/review/vendor-directory.md` records what the checks cannot decide.
