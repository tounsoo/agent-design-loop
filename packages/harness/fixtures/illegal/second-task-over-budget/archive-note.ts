/**
 * Illegal: archive-note, the second task, models a confirm step. Its modeled
 * path is 3 steps against max_steps 2. A check that measured only the first
 * task would pass this.
 */
export { flowStart, transition, userEvents } from "../../two-tasks/states";

type Node = { open: boolean; confirming: boolean; archived: boolean };

export const taskId = "archive-note";

export const taskStart: Node = { open: false, confirming: false, archived: false };

export const taskEdges = [
  { step: "open-note", when: (node: Node) => !node.open, apply: (node: Node) => ({ ...node, open: true }) },
  { step: "confirm-archive", when: (node: Node) => node.open && !node.confirming, apply: (node: Node) => ({ ...node, confirming: true }) },
  { step: "archive", when: (node: Node) => node.confirming && !node.archived, apply: (node: Node) => ({ ...node, archived: true }) },
];

export function isTaskSuccess(node: Node): boolean {
  return node.archived;
}
