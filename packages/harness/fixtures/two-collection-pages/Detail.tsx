import { Button } from "../product/catalog";
import { DetailPage } from "../product/page-types/detail";

/** Legal: one detail page with its one primary. */
export function Detail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>Three line items.</DetailPage.Body>
      <DetailPage.Primary>
        <Button.Root>Approve</Button.Root>
      </DetailPage.Primary>
    </DetailPage>
  );
}
