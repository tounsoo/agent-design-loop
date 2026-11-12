import { readScenario } from "@agent-design-loop/harness/scenarios";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Collection } from "./features/Collection";
import { Detail } from "./features/Detail";
import { scenarios } from "./flows/scenarios";
import { AppShell } from "./layouts/app-shell";
import "./styles.css";

/**
 * The fixture product's app: it renders the scenario its address names, as
 * `?scenario=<id>`, from flows/scenarios.ts, and the ready queue with none.
 * The checks that open the app in Chrome open each scenario, and
 * `npm run new:product` copies this file with the rest.
 */
function Preview() {
  const scenario = readScenario(window.location.search, scenarios);
  const state = scenario?.state ?? "ready";
  switch (state) {
    case "loading":
    case "empty":
    case "error":
      return <Collection status={state} />;
    case "invoice-approved":
    case "changes-requested":
      return <Detail status={state} />;
    default:
      return scenario !== null && "page" in scenario && scenario.page === "detail" ? <Detail status="ready" /> : <Collection status="ready" />;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <AppShell>
      <Preview />
    </AppShell>
  </StrictMode>,
);
