import type { AccessibleNames } from "../../../index";

/** The fixture product's declarations without the changes-requested preview. */
export const accessibleNames = {
  "state=loading": [{ role: "progressbar", name: "Loading invoices" }],
  "state=empty": [{ role: "heading", name: "No invoices waiting" }],
  "state=error": [{ role: "button", name: "Try again" }],
  "state=ready&page=collection": [{ role: "link", name: "To approve", current: "page" }],
  "state=ready&page=detail": [{ role: "button", name: "Approve", disabled: false }],
  "state=invoice-approved": [{ role: "status", text: "Invoice approved" }],
} satisfies AccessibleNames;
