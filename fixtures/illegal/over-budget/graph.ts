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

/** Illegal happy path: a required approval note makes the task 4 steps. max_steps stays 3. */
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
