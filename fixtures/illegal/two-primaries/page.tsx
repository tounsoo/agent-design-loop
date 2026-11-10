import { Button } from "../../../src/catalog";
import { DetailPage } from "../../../src/page-types/detail";

/** Illegal: two primary buttons in the detail primary slot. The slot check must fail. */
export function TwoPrimaries() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>INV-1842</DetailPage.Body>
      <DetailPage.Primary>
        <>
          <Button.Root>Approve</Button.Root>
          <Button.Root>Request changes</Button.Root>
        </>
      </DetailPage.Primary>
    </DetailPage>
  );
}
