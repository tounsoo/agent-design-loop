import { describe, expect, it } from "vitest";
import { tasks } from "../../inputs/product";
import { taskHappyPath } from "./graph";
import { shortestPath, type TaskEdge } from "./shortest-path";

describe("update-notification-prefs happy path", () => {
  it("is the four steps the task allows", () => {
    const task = tasks.find((item) => item.id === "update-notification-prefs");
    expect(task?.max_steps).toBe(4);
    expect(task?.success_state).toBe("prefs-saved");
    expect(taskHappyPath()).toEqual([
      "change-channel",
      "open-delivery-windows",
      "change-window",
      "save",
    ]);
    expect(taskHappyPath().length).toBeLessThanOrEqual(task?.max_steps ?? 0);
  });

  it("grows past the budget when confirm-before-save is required", () => {
    type Node = {
      channelChanged: boolean;
      deliveryOpen: boolean;
      windowChanged: boolean;
      confirming: boolean;
      saved: boolean;
    };
    const start: Node = {
      channelChanged: false,
      deliveryOpen: false,
      windowChanged: false,
      confirming: false,
      saved: false,
    };
    const edges: readonly TaskEdge<Node>[] = [
      {
        step: "change-channel",
        when: (node) => !node.channelChanged,
        apply: (node) => ({ ...node, channelChanged: true }),
      },
      {
        step: "open-delivery-windows",
        when: (node) => !node.deliveryOpen,
        apply: (node) => ({ ...node, deliveryOpen: true }),
      },
      {
        step: "change-window",
        when: (node) => node.deliveryOpen && !node.windowChanged,
        apply: (node) => ({ ...node, windowChanged: true }),
      },
      {
        step: "save",
        when: (node) => node.channelChanged && node.windowChanged && !node.confirming && !node.saved,
        apply: (node) => ({ ...node, confirming: true }),
      },
      {
        step: "confirm-before-save",
        when: (node) => node.confirming,
        apply: (node) => ({ ...node, confirming: false, saved: true }),
      },
    ];
    const path = shortestPath(start, edges, (node) => node.saved);
    const task = tasks[0];
    expect(path?.length).toBe(5);
    expect(task).toBeDefined();
    expect((path?.length ?? 0) > (task?.max_steps ?? 0)).toBe(true);
  });
});
