import type { AccessibleNames } from "@agent-design-loop/harness";

/** What a screen reader hears on each of the fixture product's scenarios, as main.tsx renders them. */
export const accessibleNames = {
  loading: [{ role: "progressbar", name: "Loading invoices" }],
  empty: [{ role: "heading", name: "No invoices waiting" }],
  error: [{ role: "status", text: "Invoices did not load Try again" }],
  queue: [{ role: "heading", name: "Invoices" }],
  "invoice-detail": [{ role: "button", name: "Approve", disabled: false }],
  "invoice-approved": [{ role: "status", text: "Invoice approved" }],
  "changes-requested": [{ role: "button", name: "Approve", disabled: true }],
} satisfies AccessibleNames;
