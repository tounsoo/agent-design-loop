import type { AccessibleNames } from "../../../index";

/** The fixture product's declarations, plus a preview the flow no longer opens: "ready" alone, which its previews replaced. */
export const accessibleNames = {
  "state=loading": [{ role: "progressbar", name: "Loading invoices" }],
  "state=empty": [{ role: "heading", name: "No invoices waiting" }],
  "state=error": [{ role: "button", name: "Try again" }],
  "state=ready": [{ role: "button", name: "Approve" }],
  "state=ready&page=collection": [{ role: "link", name: "To approve", current: "page" }],
  "state=ready&page=detail": [{ role: "button", name: "Approve", disabled: false }],
  "state=invoice-approved": [{ role: "status", text: "Invoice approved" }],
  "state=changes-requested": [{ role: "button", name: "Approve", disabled: true }],
} satisfies AccessibleNames;
