import { Button, Disclosure, Text } from "../../product/catalog";
import { DetailPage } from "../../product/page-types/detail";

/** A facts block written in the feature, not a registered content layout. */
function InvoiceFacts() {
  return (
    <Disclosure.Root>
      <Disclosure.Summary>Line items</Disclosure.Summary>
      <Text.Root>Paper stock</Text.Root>
    </Disclosure.Root>
  );
}

/** Illegal: the detail page's body holds a block the feature wrote, so a new pattern skips its proposal. */
export function Detail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <InvoiceFacts />
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
