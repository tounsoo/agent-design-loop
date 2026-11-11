import type { TaskEdge } from "@agent-design-loop/harness";

/** The task in products/nook/inputs.ts#tasks that this graph models. */
export const taskId = "hold-room";

type TaskNode = { readonly roomChosen: boolean; readonly held: boolean };

export const taskStart: TaskNode = { roomChosen: false, held: false };

/** "Pick a free room and hold it while you decide": choose a room, then Hold room. */
export const taskEdges: readonly TaskEdge<TaskNode>[] = [
  {
    step: "choose-room",
    when: (node) => !node.roomChosen,
    apply: (node) => ({ ...node, roomChosen: true }),
  },
  {
    step: "hold",
    when: (node) => node.roomChosen && !node.held,
    apply: (node) => ({ ...node, held: true }),
  },
];

export function isTaskSuccess(node: TaskNode): boolean {
  return node.held;
}

export { flowStart, transition, userEvents } from "./shipped";
