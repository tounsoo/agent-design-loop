import { describe, expect, it } from "vitest";
import { tasks } from "../../inputs/product";
import { taskHappyPath } from "./graph";
import { shortestPath, type TaskEdge } from "./shortest-path";

describe("approve-vendor-invoice happy path", () => {
  it("is the three steps the task allows", () => {
    const task = tasks.find((item) => item.id === "approve-vendor-invoice");
    expect(task?.max_steps).toBe(3);
    expect(task?.success_state).toBe("invoice-approved");
    expect(taskHappyPath()).toEqual(["open-invoice", "open-line-items", "approve"]);
    expect(taskHappyPath().length).toBeLessThanOrEqual(task?.max_steps ?? 0);
  });

  it("grows past the budget when an approval note is required", () => {
    type Node = {
      invoiceOpen: boolean;
      lineItemsOpen: boolean;
      noteWritten: boolean;
      approved: boolean;
    };
    const start: Node = { invoiceOpen: false, lineItemsOpen: false, noteWritten: false, approved: false };
    const edges: readonly TaskEdge<Node>[] = [
      {
        step: "open-invoice",
        when: (node) => !node.invoiceOpen,
        apply: (node) => ({ ...node, invoiceOpen: true }),
      },
      {
        step: "open-line-items",
        when: (node) => node.invoiceOpen && !node.lineItemsOpen,
        apply: (node) => ({ ...node, lineItemsOpen: true }),
      },
      {
        step: "write-approval-note",
        when: (node) => node.lineItemsOpen && !node.noteWritten,
        apply: (node) => ({ ...node, noteWritten: true }),
      },
      {
        step: "approve",
        when: (node) => node.noteWritten && !node.approved,
        apply: (node) => ({ ...node, approved: true }),
      },
    ];
    const path = shortestPath(start, edges, (node) => node.approved);
    const task = tasks[0];
    expect(path).toEqual(["open-invoice", "open-line-items", "write-approval-note", "approve"]);
    expect(task).toBeDefined();
    expect((path?.length ?? 0) > (task?.max_steps ?? 0)).toBe(true);
  });
});
