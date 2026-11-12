import type { AccessibleNames, KnownGaps } from "@agent-design-loop/harness";

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

/**
 * Presses that change the page without telling a screen reader, found when
 * check:accessible-names began pressing every action. Each waits for a fix in
 * its own pull request, and the check fails an entry once its press is fixed,
 * so this list only shrinks.
 */
export const knownGaps = [
  {
    presses: ['link "To approve"', 'link "All invoices"', 'link "Vendors"'],
    problem: "silent",
    why: "The side navigation swaps the main content and keeps focus on the link, where only aria-current moves. Move focus to the new page's heading, or say the page in a status region.",
  },
  {
    presses: [
      'link "To approve"',
      'link "INV-1842 , Northwind Office Supply"',
      'link "INV-1855 , Fieldnote Print"',
      'link "INV-1907 , Helios Freight"',
      'link "INV-1914 , Brightline Paper Co"',
      'link "INV-1760 , Lumen Cloud Services"',
      'link "INV-1694 , Helios Freight"',
      'link "INV-1711 , Northwind Office Supply"',
      'link "INV-1770 , Harbor & Pine Catering"',
      'link "INV-1802 , Kite Analytics"',
      'link "INV-1744 , Lumen Cloud Services"',
    ],
    problem: "focus lost",
    why: "Opening an invoice from a table, or going back to the queue from one, replaces the page around the link. Move focus to the new page's heading.",
  },
  {
    presses: ['button "Invoice"', 'button "Vendor"', 'button "Status"', 'button "Amount"', 'button "Due"', 'button "Open invoices"', 'button "Last invoice"'],
    problem: "silent",
    why: "Sorting reorders the table and changes aria-sort on the column header, which a screen reader does not read out from the focused button. Say the new order in a status region beside the table.",
  },
  {
    presses: ['button "2"', 'button "3"', 'button "Next"'],
    problem: "silent",
    why: "Paging swaps the table's rows and keeps focus on the page button. Say which rows show in a status region beside the table.",
  },
  {
    presses: ['button "Request changes"'],
    problem: "silent",
    why: "Request changes opens the reason field below and leaves focus on the button. Move focus to the field.",
  },
  {
    presses: ['button "Approve"'],
    problem: "focus lost",
    why: "Approve turns itself off, and Chrome drops focus to the page body; the status region does say the invoice was approved. Move focus to that status, or to the next action.",
  },
  {
    presses: ['button "Try again"'],
    problem: "focus lost",
    why: "Try again replaces the error with the loading state, which says nothing (the known loading gap). Announce loading in a status region and keep focus on the page.",
  },
] satisfies KnownGaps;
