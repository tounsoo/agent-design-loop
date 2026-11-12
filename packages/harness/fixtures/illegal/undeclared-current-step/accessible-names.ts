import type { AccessibleNames } from "../../../index";

/** Declarations written without a thought for the progress list: each state names only the page heading. */
export const accessibleNames = {
  ready: [{ role: "heading", name: "Northwind Office Supply" }],
  "invoice-approved": [{ role: "heading", name: "Northwind Office Supply" }],
  "changes-requested": [{ role: "heading", name: "Northwind Office Supply" }],
} satisfies AccessibleNames;
