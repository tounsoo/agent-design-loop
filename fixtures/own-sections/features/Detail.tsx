import { Button, Disclosure } from "../../../src/catalog";
import { DetailPage } from "../../../src/page-types/detail";

/** Legal: Attachments, the product's disclosed section, sits behind a disclosure. There is no Line items section. */
export function Detail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Disclosure.Root>
          <Disclosure.Summary>Attachments</Disclosure.Summary>
          Packing slip and purchase order.
        </Disclosure.Root>
      </DetailPage.Body>
      <DetailPage.Secondary>
        <Button.Root variant="secondary">Request changes</Button.Root>
      </DetailPage.Secondary>
      <DetailPage.Primary>
        <Button.Root>Approve</Button.Root>
      </DetailPage.Primary>
    </DetailPage>
  );
}
