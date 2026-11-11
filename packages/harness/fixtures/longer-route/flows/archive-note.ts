/**
 * Task graph for archive-note: open a note, archive it. The graph models the
 * shortest path only. The reducer also lets a reminded note be archived, and
 * send-reminder is the other task's step, so that route is measured too.
 */
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
