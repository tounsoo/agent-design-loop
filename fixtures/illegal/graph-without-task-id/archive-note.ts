/** Illegal: a graph for archive-note that does not export its taskId, so nothing in it says which task it models. */
export { flowStart, transition, userEvents } from "../../two-tasks/states";

type Node = { open: boolean; archived: boolean };


export const taskStart: Node = { open: false, archived: false };

export const taskEdges = [
  { step: "open-note", when: (node: Node) => !node.open, apply: (node: Node) => ({ ...node, open: true }) },
  { step: "archive", when: (node: Node) => node.open && !node.archived, apply: (node: Node) => ({ ...node, archived: true }) },
];

export function isTaskSuccess(node: Node): boolean {
  return node.archived;
}
