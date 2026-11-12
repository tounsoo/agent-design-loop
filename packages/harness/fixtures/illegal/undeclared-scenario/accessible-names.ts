import type { AccessibleNames } from "../../../index";

/** The fixture product's declarations without the changes-requested scenario. */
export const accessibleNames = {
  loading: [{ role: "progressbar", name: "Loading invoices" }],
  empty: [{ role: "heading", name: "No invoices waiting" }],
  error: [{ role: "button", name: "Try again" }],
  queue: [{ role: "link", name: "To approve", current: "page" }],
  "invoice-detail": [{ role: "button", name: "Approve", disabled: false }],
  "invoice-approved": [{ role: "status", text: "Invoice approved" }],
} satisfies AccessibleNames;
