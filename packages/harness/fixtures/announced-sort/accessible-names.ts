import type { AccessibleNames } from "../../index";

/** What the vendor list says as it loads: its heading and its one action. */
export const accessibleNames = {
  ready: [
    { role: "heading", name: "Vendors" },
    { role: "button", name: "Sort by name" },
  ],
} satisfies AccessibleNames;
