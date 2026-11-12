import { DataTable } from "../../product/content-layouts/data-table";
import { CollectionPage } from "../../content-page/page-types/collection";

/** Legal: the collection page, its ready body the registered data table. */
export function Queue() {
  return (
    <CollectionPage state="ready">
      <CollectionPage.Heading>To approve</CollectionPage.Heading>
      <CollectionPage.Body>
        <DataTable />
      </CollectionPage.Body>
    </CollectionPage>
  );
}
