import { shortestPath, type TaskEdge } from "./shortest-path";
import { sampleInvoices, type FlowEvent, type FlowState } from "./states";

/** The task in src/inputs/product.ts#tasks that this graph models. */
export const taskId = "approve-vendor-invoice";

export type TaskNode = {
  readonly invoiceOpen: boolean;
  readonly lineItemsOpen: boolean;
  readonly approved: boolean;
};

export const taskStart: TaskNode = {
  invoiceOpen: false,
  lineItemsOpen: false,
  approved: false,
};

/**
 * The task is "review a vendor invoice and approve it".
 * Success requires opening one invoice, opening its line items, and Approve.
 * Request changes is a separate branch and is not on this path.
 * There is no approval-note step.
 *
 * This is the reviewed path the budget is set for. The shipped transition
 * reducer does not require Line items before Approve, so its shortest path is
 * shorter. check:step-budget measures both against max_steps.
 */
export const taskEdges: readonly TaskEdge<TaskNode>[] = [
  {
    step: "open-invoice",
    when: (node) => !node.approved && !node.invoiceOpen,
    apply: (node) => ({ ...node, invoiceOpen: true }),
  },
  {
    step: "open-line-items",
    when: (node) => node.invoiceOpen && !node.lineItemsOpen && !node.approved,
    apply: (node) => ({ ...node, lineItemsOpen: true }),
  },
  {
    step: "approve",
    when: (node) => node.invoiceOpen && node.lineItemsOpen && !node.approved,
    apply: (node) => ({ ...node, approved: true }),
  },
];

export function isTaskSuccess(node: TaskNode): boolean {
  return node.approved;
}

export function taskHappyPath(): readonly string[] {
  const path = shortestPath(taskStart, taskEdges, isTaskSuccess);
  if (!path) throw new Error("approve-vendor-invoice has no path to invoice-approved");
  return path;
}

/** The shipped flow, for check:step-budget. The task starts at the loaded To approve queue. */
export { transition } from "./transition";

export const flowStart: FlowState = { status: "ready", screen: "collection" };

const firstPending = sampleInvoices.find((invoice) => invoice.status === "pending");
if (!firstPending) throw new Error("approve-vendor-invoice needs a pending sample invoice to measure the shipped flow.");

/**
 * Events a person can cause on the screens. loaded and failed come from the
 * system, not from the person, so they are not steps.
 */
const userEventList = [
  { type: "open-invoice", invoiceId: firstPending.id },
  { type: "open-line-items" },
  { type: "close-line-items" },
  { type: "start-request" },
  { type: "set-reason", reason: "Quantity does not match the packing slip." },
  { type: "submit-request" },
  { type: "approve" },
  { type: "retry" },
] as const satisfies readonly FlowEvent[];

/** Every FlowEvent a person can cause must be listed, or the shipped path is not fully measured. */
type SystemEventType = "loaded" | "failed";
type MissingUserEvent = Exclude<FlowEvent["type"], SystemEventType | (typeof userEventList)[number]["type"]>;
type UserEventsCovered = MissingUserEvent extends never ? true : never;
export const userEventsCovered: UserEventsCovered = true;

export const userEvents: readonly FlowEvent[] = userEventList;
