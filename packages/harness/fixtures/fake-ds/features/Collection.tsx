import { Action, Notice, Spinner } from "../catalog";
import { DataTable } from "../content-layouts/data-table";
import { CollectionPage } from "../../product/page-types/collection";

type Status = "loading" | "empty" | "error" | "ready";

/** Legal under the stand-in adapter: status states use its status parts, and an action without tone="strong" is not primary. */
export function FakeCollection({ status }: { status: Status }) {
  return (
    <CollectionPage state={status}>
      <CollectionPage.Heading>Invoices</CollectionPage.Heading>
      <CollectionPage.Body>
        {status === "loading" ? <Spinner label="Loading invoices" /> : null}
        {status === "empty" ? <Notice>No invoices waiting</Notice> : null}
        {status === "error" ? (
          <Notice>
            <Action>Try again</Action>
          </Notice>
        ) : null}
        {status === "ready" ? <DataTable /> : null}
      </CollectionPage.Body>
    </CollectionPage>
  );
}
