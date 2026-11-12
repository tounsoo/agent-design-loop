import type { AccessibleNames } from "../../index";

/** What each invoice state should say about where the invoice is. Approval runs while the invoice waits; after Approve, Payment is next, not in progress. */
export const accessibleNames = {
  ready: [
    { role: "listitem", text: "Done: Received" },
    { role: "listitem", text: "In progress: Approval", current: "step" },
    { role: "listitem", text: "Not started: Payment due Nov 18, 2026" },
  ],
  "invoice-approved": [
    { role: "listitem", text: "Done: Approval" },
    { role: "listitem", text: "Next: Payment due Nov 18, 2026", current: "step" },
  ],
  "changes-requested": [
    { role: "listitem", text: "Changes requested: Approval" },
    { role: "listitem", text: "Not started: Payment due Nov 18, 2026" },
  ],
} satisfies AccessibleNames;
