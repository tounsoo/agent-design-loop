/** The fixture product's scenarios, one of them a page with no state, so it names no case the flow handles. */
export const scenarios = {
  loading: { state: "loading" },
  empty: { state: "empty" },
  error: { state: "error" },
  queue: { state: "ready" },
  "invoice-detail": { page: "detail" },
  "invoice-approved": { state: "invoice-approved" },
  "changes-requested": { state: "changes-requested" },
};
