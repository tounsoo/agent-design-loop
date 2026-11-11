import type { AccessibleNames } from "../../../index";

/** Declarations written without a thought for the progress list: each state names only the page heading. */
export const accessibleNames = {
  "state=ready": [{ role: "heading", name: "Northwind Office Supply" }],
  "state=invoice-approved": [{ role: "heading", name: "Northwind Office Supply" }],
  "state=changes-requested": [{ role: "heading", name: "Northwind Office Supply" }],
} satisfies AccessibleNames;
