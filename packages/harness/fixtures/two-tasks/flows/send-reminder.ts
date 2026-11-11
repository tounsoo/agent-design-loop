/** Task graph for send-reminder: open a note, send the reminder. 2 steps, max_steps 2. */
export { flowStart, transition, userEvents } from "../states";

type Node = { open: boolean; reminded: boolean };

export const taskId = "send-reminder";

export const taskStart: Node = { open: false, reminded: false };

export const taskEdges = [
  { step: "open-note", when: (node: Node) => !node.open, apply: (node: Node) => ({ ...node, open: true }) },
  { step: "send-reminder", when: (node: Node) => node.open && !node.reminded, apply: (node: Node) => ({ ...node, reminded: true }) },
];

export function isTaskSuccess(node: Node): boolean {
  return node.reminded;
}
