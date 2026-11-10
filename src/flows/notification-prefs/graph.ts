import { shortestPath, type TaskEdge, type TaskNode } from "./shortest-path";

export const taskStart: TaskNode = {
  channelChanged: false,
  deliveryOpen: false,
  windowChanged: false,
  saved: false,
};

/**
 * The task is "change notification preferences and save", not "press Save".
 * Success requires a channel change, the delivery disclosure opened, a window
 * change, and Save. There is no confirm step.
 */
export const taskEdges: readonly TaskEdge<TaskNode>[] = [
  {
    step: "change-channel",
    when: (node) => !node.saved && !node.channelChanged,
    apply: (node) => ({ ...node, channelChanged: true }),
  },
  {
    step: "open-delivery-windows",
    when: (node) => !node.saved && !node.deliveryOpen,
    apply: (node) => ({ ...node, deliveryOpen: true }),
  },
  {
    step: "change-window",
    when: (node) => !node.saved && node.deliveryOpen && !node.windowChanged,
    apply: (node) => ({ ...node, windowChanged: true }),
  },
  {
    step: "save",
    when: (node) => !node.saved && node.channelChanged && node.deliveryOpen && node.windowChanged,
    apply: (node) => ({ ...node, saved: true }),
  },
];

export function isTaskSuccess(node: TaskNode): boolean {
  return node.saved;
}

export function taskHappyPath(): readonly string[] {
  const path = shortestPath(taskStart, taskEdges, isTaskSuccess);
  if (!path) {
    throw new Error("update-notification-prefs has no path to prefs-saved");
  }
  return path;
}
