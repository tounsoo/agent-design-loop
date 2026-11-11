/** Task graph for archive-note: open a note, archive it. 2 steps, max_steps 2. */
export { flowStart, transition, userEvents } from "../states";

type Node = { open: boolean; archived: boolean };

export const taskId = "archive-note";

export const taskStart: Node = { open: false, archived: false };

export const taskEdges = [
  { step: "open-note", when: (node: Node) => !node.open, apply: (node: Node) => ({ ...node, open: true }) },
  { step: "archive", when: (node: Node) => node.open && !node.archived, apply: (node: Node) => ({ ...node, archived: true }) },
];

export function isTaskSuccess(node: Node): boolean {
  return node.archived;
}
