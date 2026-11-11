import type { AccessibleNames } from "../../../index";

/** What a screen reader hears on each of the fixture product's previews. Only the --list case reads these, since the fixture product has no page to build. */
export const accessibleNames = {
  "state=loading": [{ role: "progressbar", name: "Loading invoices" }],
  "state=empty": [{ role: "heading", name: "No invoices waiting" }],
  "state=error": [{ role: "button", name: "Try again" }],
  "state=ready&page=collection": [{ role: "link", name: "To approve", current: "page" }],
  "state=ready&page=detail": [{ role: "button", name: "Approve", disabled: false }],
  "state=invoice-approved": [{ role: "status", text: "Invoice approved" }],
  "state=changes-requested": [{ role: "button", name: "Approve", disabled: true }],
} satisfies AccessibleNames;
