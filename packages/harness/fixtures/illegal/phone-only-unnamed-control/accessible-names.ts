import type { AccessibleNames } from "../../../index";

const heading = { role: "heading", name: "Northwind Office Supply" };

export const accessibleNames = {
  ready: [heading],
  "invoice-approved": [heading],
  "changes-requested": [heading],
} satisfies AccessibleNames;
