import { Button, Disclosure } from "../../product/catalog";
import { DetailPage } from "../../product/page-types/detail";

/** Illegal: the whole page, its primary Approve included, sits inside a disclosure. */
export function Wrapped() {
  return (
    <Disclosure.Root>
      <Disclosure.Summary>Line items</Disclosure.Summary>
      <DetailPage state="ready">
        <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
        <DetailPage.Secondary>
          <Button.Root variant="secondary">Request changes</Button.Root>
        </DetailPage.Secondary>
        <DetailPage.Primary>
          <Button.Root>Approve</Button.Root>
        </DetailPage.Primary>
      </DetailPage>
    </Disclosure.Root>
  );
}
