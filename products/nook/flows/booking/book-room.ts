import type { TaskEdge } from "../../../../scripts/lib/shortest-path";

/** The task in products/nook/inputs.ts#tasks that this graph models. */
export const taskId = "book-room";

type TaskNode = { readonly roomChosen: boolean; readonly booked: boolean };

export const taskStart: TaskNode = { roomChosen: false, booked: false };

/**
 * "Pick a free room and book it": choose a room, then Book room. The length
 * has a sensible default, and Room details are an optional look, so neither
 * is a step on this path. Step names are the FlowEvent types they stand for.
 */
export const taskEdges: readonly TaskEdge<TaskNode>[] = [
  {
    step: "choose-room",
    when: (node) => !node.roomChosen,
    apply: (node) => ({ ...node, roomChosen: true }),
  },
  {
    step: "book",
    when: (node) => node.roomChosen && !node.booked,
    apply: (node) => ({ ...node, booked: true }),
  },
];

export function isTaskSuccess(node: TaskNode): boolean {
  return node.booked;
}

export { flowStart, transition, userEvents } from "./shipped";
