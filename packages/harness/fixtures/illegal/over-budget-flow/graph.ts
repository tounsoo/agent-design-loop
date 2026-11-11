/**
 * Illegal: the modeled graph is 3 steps and fits, but the shipped reducer
 * requires Line items and an approval note before Approve. Its shortest path is
 * 4 steps. max_steps stays 3, so the shipped-flow budget must fail.
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

type State =
  | { status: "queue" }
  | { status: "detail"; lineItemsOpen: boolean; note: string }
  | { status: "invoice-approved" };

type Event = { type: "open-invoice" } | { type: "open-line-items" } | { type: "write-note" } | { type: "approve" };

export const flowStart: State = { status: "queue" };

export const userEvents: readonly Event[] = [
  { type: "open-invoice" },
  { type: "open-line-items" },
  { type: "write-note" },
  { type: "approve" },
];

export function transition(state: State, event: Event): State {
  if (state.status === "queue" && event.type === "open-invoice") return { status: "detail", lineItemsOpen: false, note: "" };
  if (state.status !== "detail") return state;
  if (event.type === "open-line-items") return { ...state, lineItemsOpen: true };
  if (event.type === "write-note") return { ...state, note: "Matches the PO." };
  if (event.type === "approve" && state.lineItemsOpen && state.note !== "") return { status: "invoice-approved" };
  return state;
}
