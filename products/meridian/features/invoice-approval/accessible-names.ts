import type { AccessibleNames } from "@agent-design-loop/harness";

/**
 * What a screen reader hears on each preview of the invoice-approval flow.
 * check:accessible-names opens each one in Chrome and compares. Declare what
 * changes between states: where the reader is, what a live region says, and
 * which actions are on offer or turned off.
 */

const here = (name: string) => ({ role: "link", name, current: "page" });
const queue = here("To approve");
const invoice = [queue, { role: "generic", text: "INV-1842", current: "page" }, { role: "heading", name: "Northwind Office Supply" }];
const received = { role: "listitem", text: "Done: Received" };
const paymentNotStarted = { role: "listitem", text: "Not started: Payment due Nov 18, 2026" };
/** Invoice progress while the invoice waits for approval: the reviewer's step is the one under way. */
const awaitingApproval = [received, { role: "listitem", text: "In progress: Approval", current: "step" }, paymentNotStarted];

export const accessibleNames = {
  "state=loading": [queue, { role: "heading", name: "To approve" }],
  "state=empty": [queue, { role: "heading", name: "No invoices waiting" }],
  "state=error": [queue, { role: "button", name: "Try again" }],
  "state=ready&page=collection": [
    queue,
    { role: "table", name: "Invoices to approve" },
    { role: "button", name: "1", current: "page" },
    { role: "button", name: "Previous", disabled: true },
  ],
  "state=ready&route=invoices": [here("All invoices"), { role: "table", name: "Invoices" }, { role: "button", name: "1", current: "page" }],
  "state=ready&route=vendors": [here("Vendors"), { role: "heading", name: "Vendors" }, { role: "button", name: "1", current: "page" }],
  "state=ready&page=detail": [
    ...invoice,
    ...awaitingApproval,
    { role: "DisclosureTriangle", name: "Line items", expanded: false },
    { role: "button", name: "Approve", disabled: false },
    { role: "button", name: "Request changes", disabled: false },
  ],
  "state=ready&page=detail&branch=request": [...invoice, ...awaitingApproval, { role: "textbox", name: "What should change?" }],
  "state=invoice-approved&page=detail": [
    ...invoice,
    received,
    { role: "listitem", text: "Done: Approval" },
    // Approved hands the invoice to payment, which waits for its due date: next, not in progress.
    { role: "listitem", text: "Next: Payment due Nov 18, 2026", current: "step" },
    { role: "status", text: "Invoice approved Northwind Office Supply · $4,280.00 is approved." },
    { role: "button", name: "Approve", disabled: true },
  ],
  "state=changes-requested&page=detail": [
    ...invoice,
    received,
    { role: "listitem", text: "Changes requested: Approval" },
    paymentNotStarted,
    { role: "status", text: "Changes requested Quantity on toner does not match the packing slip." },
    { role: "button", name: "Approve", disabled: true },
  ],
} satisfies AccessibleNames;
