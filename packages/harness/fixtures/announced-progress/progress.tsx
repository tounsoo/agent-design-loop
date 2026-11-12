import { Steps } from "@tounsoo/todae";
import { createRoot } from "react-dom/client";
import { readScenario } from "../../src/lib/scenario-read";
import { scenarios } from "./scenarios";

/**
 * Meridian's invoice progress list from pull request 32, built with Todae's
 * Steps. After Approve, Payment is the current stage though nothing runs
 * yet. The fix gave it the status label "Next"; without one it reads Todae's
 * default, "In progress".
 */

type StageStatus = "done" | "current" | "pending" | "error";

const stagesByState: Record<string, readonly [StageStatus, StageStatus, StageStatus]> = {
  ready: ["done", "current", "pending"],
  "invoice-approved": ["done", "done", "current"],
  "changes-requested": ["done", "error", "pending"],
};

export function InvoiceProgress({ state, waitingLabel }: { state: string; waitingLabel?: string }) {
  const [received, approval, payment] = stagesByState[state] ?? stagesByState.ready ?? [];
  return (
    <Steps.Root aria-label="Invoice progress" variant="progress">
      <Steps.Item status={received}>Received</Steps.Item>
      <Steps.Item status={approval} statusLabel={approval === "error" ? "Changes requested" : undefined}>
        Approval
      </Steps.Item>
      <Steps.Item status={payment} statusLabel={payment === "current" ? waitingLabel : undefined}>
        Payment due Nov 18, 2026
      </Steps.Item>
    </Steps.Root>
  );
}

export function render(waitingLabel?: string) {
  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root");
  const state = readScenario(window.location.search, scenarios)?.state ?? "ready";
  createRoot(root).render(
    <main>
      <h1>Northwind Office Supply</h1>
      <InvoiceProgress state={state} waitingLabel={waitingLabel} />
    </main>,
  );
}
