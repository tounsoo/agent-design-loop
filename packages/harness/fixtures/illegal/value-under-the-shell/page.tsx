import { Button, Disclosure, Text } from "../../product/catalog";
import { DetailPage } from "../../product/page-types/detail";

const extra = (
  <Disclosure.Root>
    <Disclosure.Summary>Line items</Disclosure.Summary>
    <Text.Root>Paper stock</Text.Root>
  </Disclosure.Root>
);

/** Illegal: a block held in a const is placed straight under the shell, outside every slot. */
export function Detail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      {extra}
      <DetailPage.Body>
        <Text.Root>Paper stock</Text.Root>
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
