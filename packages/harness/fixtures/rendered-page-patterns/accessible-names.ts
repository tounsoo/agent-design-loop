import type { AccessibleNames } from "@agent-design-loop/harness";

/** The ready state opens Add a vendor on purpose, so check:rendered-page lets it load open. */
export const accessibleNames = {
  ready: [{ role: "DisclosureTriangle", name: "Add a vendor", expanded: true }],
} satisfies AccessibleNames;
