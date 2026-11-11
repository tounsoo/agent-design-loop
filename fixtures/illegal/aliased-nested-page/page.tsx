import { CollectionPage } from "../../../src/page-types/collection";
import { DetailPage as Invoice } from "../../../src/page-types/detail";

/** Illegal: a detail page, imported under another name, rendered inside a collection page. An alias must not hide it. */
export function AliasedNestedPage() {
  return (
    <CollectionPage state="ready">
      <CollectionPage.Heading>To approve</CollectionPage.Heading>
      <CollectionPage.Body>
        <Invoice state="ready">
          <Invoice.Heading>Northwind Office Supply</Invoice.Heading>
        </Invoice>
      </CollectionPage.Body>
    </CollectionPage>
  );
}
