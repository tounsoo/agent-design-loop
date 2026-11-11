import { CollectionPage } from "../../../src/page-types/collection";
import { DetailPage } from "../../../src/page-types/detail";

/** A queue of other invoices, built as a whole collection page. */
function OtherInvoices() {
  return (
    <CollectionPage state="ready">
      <CollectionPage.Heading>Other invoices</CollectionPage.Heading>
      <CollectionPage.Body>Four more from this vendor.</CollectionPage.Body>
    </CollectionPage>
  );
}

/** Illegal: a detail page that renders a collection page inside its body, through a component. Two jobs on one page. */
export function NestedPage() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <OtherInvoices />
      </DetailPage.Body>
    </DetailPage>
  );
}
