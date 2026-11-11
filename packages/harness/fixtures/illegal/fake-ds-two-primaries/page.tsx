import { Action } from "../../fake-ds/catalog";
import { DetailPage } from "../../product/page-types/detail";

/** Illegal under the stand-in adapter: two strong actions in the detail primary slot. The slot check must fail. */
export function FakeTwoPrimaries() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>INV-1842</DetailPage.Body>
      <DetailPage.Primary>
        <>
          <Action tone="strong">Approve</Action>
          <Action tone="strong">Request changes</Action>
        </>
      </DetailPage.Primary>
    </DetailPage>
  );
}
