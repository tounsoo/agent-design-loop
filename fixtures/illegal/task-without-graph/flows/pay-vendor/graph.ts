/** Illegal: the only graph models a task that is not in tasks, so approve-vendor-invoice has none. */
export const taskId = "pay-vendor";

type Node = { paid: boolean };

export const taskStart: Node = { paid: false };

export const taskEdges = [
  {
    step: "pay",
    when: (node: Node) => !node.paid,
    apply: (node: Node) => ({ ...node, paid: true }),
  },
];

export function isTaskSuccess(node: Node): boolean {
  return node.paid;
}
