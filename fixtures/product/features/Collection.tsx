import { Alert, Button, EmptyState, Loader } from "../catalog";
import { DataTable } from "../content-layouts/data-table";
import { CollectionPage } from "../page-types/collection";

type Status = "loading" | "empty" | "error" | "ready";

/** Legal: status states use the catalog's status parts, and the ready body is the registered data-table layout. */
export function Collection({ status }: { status: Status }) {
  return (
    <CollectionPage state={status}>
      <CollectionPage.Heading>Invoices</CollectionPage.Heading>
      <CollectionPage.Body>
        {status === "loading" ? <Loader.Root aria-label="Loading invoices" /> : null}
        {status === "empty" ? <EmptyState.Root>No invoices waiting</EmptyState.Root> : null}
        {status === "error" ? (
          <Alert.Root>
            <Button.Root variant="secondary">Try again</Button.Root>
          </Alert.Root>
        ) : null}
        {status === "ready" ? <DataTable /> : null}
      </CollectionPage.Body>
    </CollectionPage>
  );
}
