import { Button, Disclosure } from "../product/catalog";
import { DetailPage } from "../product/page-types/detail";

/** One of two record pages. Each holds its own primary Approve. */
export function Helios() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Helios</DetailPage.Heading>
      <DetailPage.Body>
        <Disclosure.Root>
          <Disclosure.Summary>Line items</Disclosure.Summary>
          Paper stock
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
