import type { AccessibleNames } from "../../../index";

const heading = { role: "heading", name: "Northwind Office Supply" };

export const accessibleNames = {
  "state=ready": [heading],
  "state=invoice-approved": [heading],
  "state=changes-requested": [heading],
} satisfies AccessibleNames;
