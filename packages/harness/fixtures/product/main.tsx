import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Collection } from "./features/Collection";
import { Detail } from "./features/Detail";
import { AppShell } from "./layouts/app-shell";
import "./styles.css";

/**
 * The fixture product's app: it renders the preview its address names, as
 * `?state=<modeled state>` and, for ready, `&page=collection` or
 * `&page=detail`. The checks that open the app in Chrome open each preview
 * the config lists, and `npm run new:product` copies this file with the rest.
 */
function Preview() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get("state") ?? "ready";
  switch (state) {
    case "loading":
    case "empty":
    case "error":
      return <Collection status={state} />;
    case "invoice-approved":
    case "changes-requested":
      return <Detail status={state} />;
    default:
      return params.get("page") === "detail" ? <Detail status="ready" /> : <Collection status="ready" />;
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
