/** The approval task: open the invoice, then approve it. The graph and the shipped reducer agree on both steps. */
export const taskId = "approve-vendor-invoice";

type Node = { invoiceOpen: boolean; approved: boolean };

export const taskStart: Node = { invoiceOpen: false, approved: false };

export const taskEdges = [
  {
    step: "open-invoice",
    when: (node: Node) => !node.invoiceOpen,
    apply: (node: Node) => ({ ...node, invoiceOpen: true }),
  },
  {
    step: "approve",
    when: (node: Node) => node.invoiceOpen && !node.approved,
    apply: (node: Node) => ({ ...node, approved: true }),
  },
];

export function isTaskSuccess(node: Node): boolean {
  return node.approved;
}

type State = { status: "queue" } | { status: "detail" } | { status: "invoice-approved" };

type Event = { type: "open-invoice" } | { type: "approve" };

export const flowStart: State = { status: "queue" };

export const userEvents: readonly Event[] = [{ type: "open-invoice" }, { type: "approve" }];

export function transition(state: State, event: Event): State {
  if (state.status === "queue" && event.type === "open-invoice") return { status: "detail" };
  if (state.status === "detail" && event.type === "approve") return { status: "invoice-approved" };
  return state;
}
