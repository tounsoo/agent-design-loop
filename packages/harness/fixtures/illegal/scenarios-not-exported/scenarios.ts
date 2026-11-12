/** The fixture product's scenarios under another name, so the flow exports no `scenarios`. */
export const cases = {
  loading: { state: "loading" },
  empty: { state: "empty" },
  error: { state: "error" },
  queue: { state: "ready" },
  "invoice-approved": { state: "invoice-approved" },
  "changes-requested": { state: "changes-requested" },
};
