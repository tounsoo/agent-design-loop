/** The fixture product's modeled states. */
export const modeledStates = ["loading", "empty", "error", "ready", "invoice-approved", "changes-requested"] as const;

export type ModeledState = (typeof modeledStates)[number];
