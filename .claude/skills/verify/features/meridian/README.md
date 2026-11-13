# Meridian verification map

Meridian is the accounts-payable demo in `products/meridian/`, checked with `products/meridian/harness.config.ts`. Read [the map's index](../README.md) for the preconditions and conventions every recipe here assumes, then use the matching feature file.

- Serve it with `npm run build && npm run preview` at `http://127.0.0.1:4173/`, or `npm run dev` at `http://127.0.0.1:5173/`.
- Its Vitest journeys are `products/meridian/App.test.tsx` and `products/meridian/features/invoice-approval/InvoiceApproval.test.tsx`.

## Features

- [Payables collections](collections.md): To approve, All invoices and Vendors, with search, paging and adding a vendor.
- [Approve an invoice](approve-invoice.md): the named task, two steps to `invoice-approved`.
- [Request changes](request-changes.md): the branch, with its required reason.
- [The vendor page](vendor-page.md): a vendor's facts and invoices, a content page with no button.
- [Scenarios](scenarios.md): `?scenario=` URLs and the Preview menu.

When a feature is added or changes, update its file in the same pull request, and its `## Covers` section with it.
