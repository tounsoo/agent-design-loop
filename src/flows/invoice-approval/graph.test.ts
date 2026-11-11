import { describe, expect, it } from "vitest";
import { tasks } from "../../inputs/product";
import { flowStart, taskHappyPath, taskId, transition, userEvents } from "./graph";
import { eventEdges, shortestPath, type TaskEdge } from "./shortest-path";

describe("approve-vendor-invoice happy path", () => {
  it("is two steps, inside the budget", () => {
    const task = tasks.find((item) => item.id === "approve-vendor-invoice");
    expect(task?.max_steps).toBe(3);
    expect(task?.success_state).toBe("invoice-approved");
    expect(taskHappyPath()).toEqual(["open-invoice", "approve"]);
    expect(taskHappyPath().length).toBeLessThanOrEqual(task?.max_steps ?? 0);
  });

  it("is one step longer, and still inside the budget, when an approval note is required", () => {
    type Node = {
      invoiceOpen: boolean;
      noteWritten: boolean;
      approved: boolean;
    };
    const start: Node = { invoiceOpen: false, noteWritten: false, approved: false };
    const edges: readonly TaskEdge<Node>[] = [
      {
        step: "open-invoice",
        when: (node) => !node.invoiceOpen,
        apply: (node) => ({ ...node, invoiceOpen: true }),
      },
      {
        step: "write-approval-note",
        when: (node) => node.invoiceOpen && !node.noteWritten,
        apply: (node) => ({ ...node, noteWritten: true }),
      },
      {
        step: "approve",
        when: (node) => node.noteWritten && !node.approved,
        apply: (node) => ({ ...node, approved: true }),
      },
    ];
    const path = shortestPath(start, edges, (node) => node.approved);
    const task = tasks.find((item) => item.id === "approve-vendor-invoice");
    expect(path).toEqual(["open-invoice", "write-approval-note", "approve"]);
    expect(path?.length).toBe(taskHappyPath().length + 1);
    expect(path?.length ?? Infinity).toBeLessThanOrEqual(task?.max_steps ?? 0);
  });
});

describe("approve-vendor-invoice shipped flow", () => {
  it("reaches invoice-approved without opening line items", () => {
    const path = shortestPath(flowStart, eventEdges(userEvents, transition), (state) => state.status === "invoice-approved");
    expect(path).toEqual(["open-invoice", "approve"]);
    expect(path).toEqual(taskHappyPath());
  });

  it("models the task the product inputs name", () => {
    expect(tasks.some((task) => task.id === taskId)).toBe(true);
  });
});
