/**
 * Legal: the shipped flow keeps a state's name in `phase`, not `status`, and
 * the graph module says so with flowStatus. The graph and the reducer agree on
 * both steps.
 */
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

type State = { phase: "queue" } | { phase: "detail" } | { phase: "invoice-approved" };

type Event = { type: "open-invoice" } | { type: "approve" };

export const flowStart: State = { phase: "queue" };

export const userEvents: readonly Event[] = [{ type: "open-invoice" }, { type: "approve" }];

export function transition(state: State, event: Event): State {
  if (state.phase === "queue" && event.type === "open-invoice") return { phase: "detail" };
  if (state.phase === "detail" && event.type === "approve") return { phase: "invoice-approved" };
  return state;
}

export function flowStatus(state: State): string {
  return state.phase;
}
