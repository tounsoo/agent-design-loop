import type { AccessibleNames } from "@agent-design-loop/harness";

/** What a screen reader hears on each of the fixture product's previews, as main.tsx renders them. */
export const accessibleNames = {
  "state=loading": [{ role: "progressbar", name: "Loading invoices" }],
  "state=empty": [{ role: "heading", name: "No invoices waiting" }],
  "state=error": [{ role: "status", text: "Invoices did not load Try again" }],
  "state=ready&page=collection": [{ role: "heading", name: "Invoices" }],
  "state=ready&page=detail": [{ role: "button", name: "Approve", disabled: false }],
  "state=invoice-approved": [{ role: "status", text: "Invoice approved" }],
  "state=changes-requested": [{ role: "button", name: "Approve", disabled: true }],
} satisfies AccessibleNames;
