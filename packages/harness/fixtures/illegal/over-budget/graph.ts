export const taskId = "approve-vendor-invoice";

type Node = {
  invoiceOpen: boolean;
  lineItemsOpen: boolean;
  noteWritten: boolean;
  approved: boolean;
};

export const taskStart: Node = {
  invoiceOpen: false,
  lineItemsOpen: false,
  noteWritten: false,
  approved: false,
};

/** Illegal happy path: a required approval note makes the task 4 steps, in the graph and in the shipped flow. max_steps stays 3. */
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
    step: "write-approval-note",
    when: (node: Node) => node.lineItemsOpen && !node.noteWritten && !node.approved,
    apply: (node: Node) => ({ ...node, noteWritten: true }),
  },
  {
    step: "approve",
    when: (node: Node) => node.noteWritten && !node.approved,
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

type Event =
  | { type: "open-invoice" }
  | { type: "open-line-items" }
  | { type: "write-approval-note" }
  | { type: "approve" };

export const flowStart: State = { status: "queue" };

export const userEvents: readonly Event[] = [
  { type: "open-invoice" },
  { type: "open-line-items" },
  { type: "write-approval-note" },
  { type: "approve" },
];

export function transition(state: State, event: Event): State {
  if (state.status === "queue" && event.type === "open-invoice") return { status: "detail", lineItemsOpen: false, note: "" };
  if (state.status !== "detail") return state;
  if (event.type === "open-line-items") return { ...state, lineItemsOpen: true };
  if (event.type === "write-approval-note" && state.lineItemsOpen) return { ...state, note: "Matches the PO." };
  if (event.type === "approve" && state.note !== "") return { status: "invoice-approved" };
  return state;
}
