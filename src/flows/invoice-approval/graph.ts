import { shortestPath, type TaskEdge } from "./shortest-path";

export type TaskNode = {
  readonly invoiceOpen: boolean;
  readonly lineItemsOpen: boolean;
  readonly approved: boolean;
};

export const taskStart: TaskNode = {
  invoiceOpen: false,
  lineItemsOpen: false,
  approved: false,
};

/**
 * The task is "review a vendor invoice and approve it".
 * Success requires opening one invoice, opening its line items, and Approve.
 * Request changes is a separate branch and is not on this path.
 * There is no approval-note step.
 */
export const taskEdges: readonly TaskEdge<TaskNode>[] = [
  {
    step: "open-invoice",
    when: (node) => !node.approved && !node.invoiceOpen,
    apply: (node) => ({ ...node, invoiceOpen: true }),
  },
  {
    step: "open-line-items",
    when: (node) => node.invoiceOpen && !node.lineItemsOpen && !node.approved,
    apply: (node) => ({ ...node, lineItemsOpen: true }),
  },
  {
    step: "approve",
    when: (node) => node.invoiceOpen && node.lineItemsOpen && !node.approved,
    apply: (node) => ({ ...node, approved: true }),
  },
];

export function isTaskSuccess(node: TaskNode): boolean {
  return node.approved;
}

export function taskHappyPath(): readonly string[] {
  const path = shortestPath(taskStart, taskEdges, isTaskSuccess);
  if (!path) throw new Error("approve-vendor-invoice has no path to invoice-approved");
  return path;
}
