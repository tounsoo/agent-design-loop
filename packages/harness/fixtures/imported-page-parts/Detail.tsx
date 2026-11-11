import { DetailPage } from "../product/page-types/detail";
import { RequestChanges as Secondary } from "./parts/actions";
import ApproveAction from "./parts/approve";
import { LineItems } from "./parts";

/** One record page whose parts come in under an alias, as a default export, and through an `export *` barrel. */
export function Detail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <LineItems />
      </DetailPage.Body>
      <DetailPage.Secondary>
        <Secondary />
      </DetailPage.Secondary>
      <DetailPage.Primary>
        <ApproveAction />
      </DetailPage.Primary>
    </DetailPage>
  );
}
