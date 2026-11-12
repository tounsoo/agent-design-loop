import type { AccessibleNames, KnownGaps } from "@agent-design-loop/harness";

/**
 * What a screen reader hears on each scenario of the invoice-approval flow.
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
/** A vendor page: Vendors stays current in the navigation, the breadcrumb's last item and the title name the vendor. */
const vendorPage = (name: string) => [vendors, { role: "link", name: "Vendors" }, { role: "generic", text: name, current: "page" }, { role: "heading", name }];
const openInvoices = [{ role: "heading", name: "Open invoices" }, { role: "table", name: "Open invoices" }];
const approvedInvoices = [{ role: "heading", name: "Approved" }, { role: "table", name: "Approved" }];
/** Invoice progress while the invoice waits for approval: the reviewer's step is the one under way. */
const awaitingApproval = [received, { role: "listitem", text: "In progress: Approval", current: "step" }, paymentNotStarted];

export const accessibleNames = {
  loading: [queue, { role: "heading", name: "To approve" }, { role: "status", text: "Loading invoices" }],
  empty: [queue, { role: "heading", name: "No invoices waiting" }],
  error: [queue, { role: "alert", text: "Couldn't load invoices." }, { role: "button", name: "Try again" }],
  queue: [
    queue,
    { role: "table", name: "Invoices to approve" },
    { role: "button", name: "1", current: "page" },
    { role: "button", name: "Previous", disabled: true },
  ],
  invoices: [here("All invoices"), { role: "table", name: "Invoices" }, { role: "button", name: "1", current: "page" }],
  vendors: [
    vendors,
    { role: "heading", name: "Vendors" },
    { role: "searchbox", name: "Search vendors" },
    { role: "DisclosureTriangle", name: "Add a vendor", expanded: false },
    { role: "list", name: "Vendors" },
  ],
  "invoice-detail": [
    ...invoice,
    ...awaitingApproval,
    { role: "DisclosureTriangle", name: "Line items", expanded: false },
    { role: "button", name: "Approve", disabled: false },
    { role: "button", name: "Request changes", disabled: false },
  ],
  "invoice-requesting-changes": [...invoice, ...awaitingApproval, { role: "textbox", name: "What should change?" }],
  "invoice-approved": [
    ...invoice,
    received,
    { role: "listitem", text: "Done: Approval" },
    // Approved hands the invoice to payment, which waits for its due date: next, not in progress.
    { role: "listitem", text: "Next: Payment due Nov 18, 2026", current: "step" },
    { role: "status", text: "Invoice approved Northwind Office Supply · $4,280.00 is approved." },
    { role: "button", name: "Approve", disabled: true },
  ],
  "changes-requested": [
    ...invoice,
    received,
    { role: "listitem", text: "Changes requested: Approval" },
    paymentNotStarted,
    { role: "status", text: "Changes requested Quantity on toner does not match the packing slip." },
    { role: "button", name: "Approve", disabled: true },
  ],
  "vendor-added": [
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
  "vendor-helios-freight": [
    ...vendorPage("Helios Freight"),
    ...openInvoices,
    { role: "link", name: "INV-1907" },
    ...approvedInvoices,
    { role: "link", name: "INV-1694" },
  ],
  "vendor-harbor-and-pine": [...vendorPage("Harbor & Pine Catering"), ...openInvoices, { role: "link", name: "INV-1770" }, { role: "link", name: "INV-1888" }],
  "vendor-nothing-open": [...vendorPage("Kite Analytics"), ...approvedInvoices, { role: "link", name: "INV-1802" }],
  "vendor-no-invoices": [...vendorPage("Okafor & Lindqvist Commercial Facilities Maintenance Cooperative")],
  "vendor-unknown": [vendors, { role: "heading", name: "Vendors" }, { role: "searchbox", name: "Search vendors" }, { role: "list", name: "Vendors" }],
} satisfies AccessibleNames;

/**
 * Presses that change the page without telling a screen reader. The app
 * shell moves focus to the new page's heading on every page change, and
 * submits keep focus (`submitOff`), so what is left changes one page in
 * place. Each entry names where its fix is tracked, and the check fails an
 * entry once its press is fixed on a scenario it names, so this list only
 * shrinks.
 */
export const knownGaps = [
  {
    presses: ['button "Request changes"'],
    problem: "silent",
    scenarios: ["invoice-detail", "invoice-requesting-changes"],
    why: "Request changes opens the reason field below and leaves focus on the button. Move focus to the field.",
    fixIn: "https://github.com/tounsoo/agent-design-loop/issues/51",
  },
  {
    presses: ['button "Try again"'],
    problem: "focus lost",
    scenarios: ["error"],
    why: "Try again replaces the error, and the button with it, with the loading state, so focus falls to the page body. Move focus to the loading state's status, or keep a focusable element in the button's place.",
    fixIn: "https://github.com/tounsoo/agent-design-loop/issues/50",
  },
] satisfies KnownGaps;
