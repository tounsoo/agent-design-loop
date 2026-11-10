type Node = {
  channelChanged: boolean;
  deliveryOpen: boolean;
  windowChanged: boolean;
  confirming: boolean;
  saved: boolean;
};

export const taskStart: Node = {
  channelChanged: false,
  deliveryOpen: false,
  windowChanged: false,
  confirming: false,
  saved: false,
};

/** Illegal happy path: confirm-before-save makes the task 5 steps. max_steps stays 4. */
export const taskEdges = [
  {
    step: "change-channel",
    when: (node: Node) => !node.saved && !node.confirming && !node.channelChanged,
    apply: (node: Node) => ({ ...node, channelChanged: true }),
  },
  {
    step: "open-delivery-windows",
    when: (node: Node) => !node.saved && !node.confirming && !node.deliveryOpen,
    apply: (node: Node) => ({ ...node, deliveryOpen: true }),
  },
  {
    step: "change-window",
    when: (node: Node) => !node.saved && !node.confirming && node.deliveryOpen && !node.windowChanged,
    apply: (node: Node) => ({ ...node, windowChanged: true }),
  },
  {
    step: "save",
    when: (node: Node) =>
      !node.saved && !node.confirming && node.channelChanged && node.deliveryOpen && node.windowChanged,
    apply: (node: Node) => ({ ...node, confirming: true }),
  },
  {
    step: "confirm-before-save",
    when: (node: Node) => node.confirming && !node.saved,
    apply: (node: Node) => ({ ...node, confirming: false, saved: true }),
  },
];

export function isTaskSuccess(node: Node): boolean {
  return node.saved;
}
