import { CollectionPage } from "../../src/page-types/collection";

/** Legal: a second collection page in another file. Under the old per-product count this failed. */
export function Archive() {
  return (
    <CollectionPage state="ready">
      <CollectionPage.Heading>Archive</CollectionPage.Heading>
      <CollectionPage.Body>Invoices you have finished.</CollectionPage.Body>
    </CollectionPage>
  );
}
