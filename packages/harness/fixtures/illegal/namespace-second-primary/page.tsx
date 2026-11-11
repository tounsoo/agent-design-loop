import { Button, Disclosure } from "../../product/catalog";
import * as UI from "../../product/catalog";
import { DetailPage } from "../../product/page-types/detail";

/** Illegal: a second primary button on the page, written through a namespace import. */
export function NamespacePrimary() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Disclosure.Root>
          <Disclosure.Summary>Line items</Disclosure.Summary>
          Paper stock
        </Disclosure.Root>
        <UI.Button.Root>Pay now</UI.Button.Root>
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
