/**
 * Illegal: the shortest modeled path is open-invoice → approve, 2 steps, and
 * the shipped reducer agrees. But the graph also models flagging the invoice
 * and adding a note before Approve, so one modeled route is 4 steps, over
 * max_steps 3.
 */
export const taskId = "approve-vendor-invoice";

type Node = { invoiceOpen: boolean; flagged: boolean; noted: boolean; approved: boolean };

export const taskStart: Node = { invoiceOpen: false, flagged: false, noted: false, approved: false };

export const taskEdges = [
  {
    step: "open-invoice",
    when: (node: Node) => !node.invoiceOpen,
    apply: (node: Node) => ({ ...node, invoiceOpen: true }),
  },
  {
    step: "flag",
    when: (node: Node) => node.invoiceOpen && !node.flagged && !node.approved,
    apply: (node: Node) => ({ ...node, flagged: true }),
  },
  {
    step: "add-note",
    when: (node: Node) => node.flagged && !node.noted && !node.approved,
    apply: (node: Node) => ({ ...node, noted: true }),
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
