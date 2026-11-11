import { Action } from "../../fake-ds/catalog";
import { CollectionPage } from "../../product/page-types/collection";

/** Illegal under the stand-in adapter: a strong action on the collection page. */
export function FakeCollectionPrimary() {
  return (
    <CollectionPage state="ready">
      <CollectionPage.Heading>Invoices</CollectionPage.Heading>
      <CollectionPage.Body>
        <Action tone="strong">Approve all</Action>
      </CollectionPage.Body>
    </CollectionPage>
  );
}
