/**
 * Illegal: the task graph and the shipped reducer disagree. The graph models
 * open-invoice → open-line-items → approve, 3 steps. The reducer lets Approve
 * through without Line items, so its shortest path is 2 steps. Both fit
 * max_steps 3, but the graph no longer describes what ships.
 */
export const taskId = "approve-vendor-invoice";

type Node = { invoiceOpen: boolean; lineItemsOpen: boolean; approved: boolean };

export const taskStart: Node = { invoiceOpen: false, lineItemsOpen: false, approved: false };

export const taskEdges = [
  {
    step: "open-invoice",
    when: (node: Node) => !node.invoiceOpen,
    apply: (node: Node) => ({ ...node, invoiceOpen: true }),
  },
  {
    step: "open-line-items",
    when: (node: Node) => node.invoiceOpen && !node.lineItemsOpen,
    apply: (node: Node) => ({ ...node, lineItemsOpen: true }),
  },
  {
    step: "approve",
    when: (node: Node) => node.lineItemsOpen && !node.approved,
    apply: (node: Node) => ({ ...node, approved: true }),
  },
];

export function isTaskSuccess(node: Node): boolean {
  return node.approved;
}

type State = { status: "queue" } | { status: "detail"; lineItemsOpen: boolean } | { status: "invoice-approved" };

type Event = { type: "open-invoice" } | { type: "open-line-items" } | { type: "approve" };

export const flowStart: State = { status: "queue" };

export const userEvents: readonly Event[] = [{ type: "open-invoice" }, { type: "open-line-items" }, { type: "approve" }];

export function transition(state: State, event: Event): State {
  if (state.status === "queue" && event.type === "open-invoice") return { status: "detail", lineItemsOpen: false };
  if (state.status !== "detail") return state;
  if (event.type === "open-line-items") return { ...state, lineItemsOpen: true };
  if (event.type === "approve") return { status: "invoice-approved" };
  return state;
}
