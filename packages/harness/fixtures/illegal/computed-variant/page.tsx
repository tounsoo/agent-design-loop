import { Button, Disclosure } from "../../product/catalog";
import { DetailPage } from "../../product/page-types/detail";

/** Illegal: a second button whose variant is computed, so it may render as a second primary. */
export function ComputedVariant({ urgent }: { urgent: boolean }) {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Disclosure.Root>
          <Disclosure.Summary>Line items</Disclosure.Summary>
          Paper stock
        </Disclosure.Root>
        <Button.Root variant={urgent ? "primary" : "secondary"}>Pay now</Button.Root>
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
