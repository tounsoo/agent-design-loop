import { CollectionPage } from "../../src/page-types/collection";

/** Legal: the first collection page. */
export function Queue() {
  return (
    <CollectionPage state="ready">
      <CollectionPage.Heading>To approve</CollectionPage.Heading>
      <CollectionPage.Body>Invoices waiting on you.</CollectionPage.Body>
    </CollectionPage>
  );
}
