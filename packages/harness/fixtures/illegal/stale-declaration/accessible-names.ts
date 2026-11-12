import type { AccessibleNames } from "../../../index";

/** The fixture product's declarations, plus a scenario the flow no longer opens: "ready" alone, which its scenarios replaced. */
export const accessibleNames = {
  loading: [{ role: "progressbar", name: "Loading invoices" }],
  empty: [{ role: "heading", name: "No invoices waiting" }],
  error: [{ role: "button", name: "Try again" }],
  ready: [{ role: "button", name: "Approve" }],
  queue: [{ role: "link", name: "To approve", current: "page" }],
  "invoice-detail": [{ role: "button", name: "Approve", disabled: false }],
  "invoice-approved": [{ role: "status", text: "Invoice approved" }],
  "changes-requested": [{ role: "button", name: "Approve", disabled: true }],
} satisfies AccessibleNames;
