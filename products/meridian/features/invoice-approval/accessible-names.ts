import type { AccessibleNames, KnownGaps } from "@agent-design-loop/harness";

/**
 * What a screen reader hears on each preview of the invoice-approval flow.
 * check:accessible-names opens each one in Chrome and compares. Declare what
 * changes between states: where the reader is, what a live region says, and
 * which actions are on offer or turned off.
 */

const here = (name: string) => ({ role: "link", name, current: "page" });
const queue = here("To approve");
const vendors = here("Vendors");
const invoice = [queue, { role: "generic", text: "INV-1842", current: "page" }, { role: "heading", name: "Northwind Office Supply" }];
const received = { role: "listitem", text: "Done: Received" };
const paymentNotStarted = { role: "listitem", text: "Not started: Payment due Nov 18, 2026" };
/** The vendor and activity sections every invoice page shows, after its line items. */
const sections = [{ role: "region", name: "Vendor" }, { role: "table", name: "Activity" }];
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
  "state=ready&route=vendors": [
    vendors,
    { role: "heading", name: "Vendors" },
    { role: "searchbox", name: "Search vendors" },
    { role: "DisclosureTriangle", name: "Add a vendor", expanded: false },
    { role: "list", name: "Vendors" },
  ],
  "state=ready&page=detail": [
    ...invoice,
    ...awaitingApproval,
    { role: "DisclosureTriangle", name: "Line items", expanded: false },
    ...sections,
    { role: "row", text: "Oct 20, 2026 Sent for approval" },
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
    ...sections,
    // The decision this preview shows is not in the sample data, so the activity dates it today.
    { role: "row", text: "Today Approved" },
    { role: "button", name: "Approve", disabled: true },
  ],
  "state=changes-requested&page=detail": [
    ...invoice,
    received,
    { role: "listitem", text: "Changes requested: Approval" },
    paymentNotStarted,
    { role: "status", text: "Changes requested Quantity on toner does not match the packing slip." },
    ...sections,
    { role: "row", text: "Today Changes requested" },
    { role: "button", name: "Approve", disabled: true },
  ],
  "state=vendor-added": [
    vendors,
    { role: "heading", name: "Vendors" },
    { role: "DisclosureTriangle", name: "Add a vendor", expanded: true },
    { role: "status", text: "Added Ridgeway Janitorial." },
    { role: "textbox", name: "Vendor name" },
    { role: "textbox", name: "Remittance email" },
    { role: "combobox", name: "Payment terms" },
    { role: "button", name: "Add vendor" },
    { role: "heading", name: "Ridgeway Janitorial" },
  ],
} satisfies AccessibleNames;

/**
 * Presses that change the page without telling a screen reader, found when
 * check:accessible-names began pressing every action. Each waits for a fix in
 * its own pull request, and the check fails an entry once its press is fixed
 * on a preview it names, so this list only shrinks.
 */
export const knownGaps = [
  {
    presses: ['link "To approve"'],
    problem: "silent",
    previews: ["state=loading", "state=empty", "state=error"],
    why: "These previews already show the To approve title, so going to To approve swaps in the queue and the shell's announcer, which speaks only when the title changes, says nothing. Announce every navigation, or move focus to the page heading.",
  },
  {
    presses: ['link "Vendors"'],
    problem: "silent",
    previews: ["state=vendor-added"],
    why: "This preview already shows the Vendors title, so going to Vendors resets the list and the shell's announcer, which speaks only when the title changes, says nothing. Announce every navigation, or move focus to the page heading.",
  },
  {
    presses: [
      'link "INV-1842 , Northwind Office Supply"',
      'link "INV-1855 , Fieldnote Print"',
      'link "INV-1907 , Helios Freight"',
      'link "INV-1914 , Brightline Paper Co"',
      'link "INV-1760 , Lumen Cloud Services"',
    ],
    problem: "focus lost",
    previews: ["state=ready&page=collection"],
    why: "Opening an invoice from the queue replaces the table, and the link with it, with the invoice page, so focus falls to the page body. Move focus to the invoice page's heading.",
  },
  {
    presses: [
      'link "INV-1694 , Helios Freight"',
      'link "INV-1711 , Northwind Office Supply"',
      'link "INV-1770 , Harbor & Pine Catering"',
      'link "INV-1802 , Kite Analytics"',
      'link "INV-1744 , Lumen Cloud Services"',
    ],
    problem: "focus lost",
    previews: ["state=ready&route=invoices"],
    why: "Opening an invoice from All invoices replaces the table, and the link with it, with the invoice page, so focus falls to the page body. Move focus to the invoice page's heading.",
  },
  {
    presses: ['link "To approve"'],
    problem: "focus lost",
    previews: ["state=ready&page=detail", "state=ready&page=detail&branch=request", "state=invoice-approved&page=detail", "state=changes-requested&page=detail"],
    why: "On an invoice page, going to To approve replaces the invoice with the queue, and the link pressed goes with it, so focus falls to the page body. Move focus to the queue's heading.",
  },
  {
    presses: ['button "Request changes"'],
    problem: "silent",
    previews: ["state=ready&page=detail", "state=ready&page=detail&branch=request"],
    why: "Request changes opens the reason field below and leaves focus on the button. Move focus to the field.",
  },
  {
    presses: ['button "Approve"'],
    problem: "focus lost",
    previews: ["state=ready&page=detail", "state=ready&page=detail&branch=request"],
    why: "Approve turns itself off, and Chrome drops focus to the page body; the status region does say the invoice was approved. Move focus to that status, or to the next action.",
  },
  {
    presses: ['button "Try again"'],
    problem: "focus lost",
    previews: ["state=error"],
    why: "Try again replaces the error, and the button with it, with the loading state, so focus falls to the page body. Move focus to the loading state's heading, or keep a focusable element in the button's place.",
  },
] satisfies KnownGaps;
