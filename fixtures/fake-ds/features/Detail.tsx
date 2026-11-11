import { Action, Ask, Reveal } from "../catalog";
import { DetailPage } from "../../../src/page-types/detail";

/** Legal under the stand-in adapter: one strong action, one quiet action, line items behind a disclosure, one question. */
export function FakeDetail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Reveal.Root>
          <Reveal.Label>Line items</Reveal.Label>
          Paper stock
        </Reveal.Root>
        <Ask label="What should change?" />
      </DetailPage.Body>
      <DetailPage.Secondary>
        <Action tone="quiet">Request changes</Action>
      </DetailPage.Secondary>
      <DetailPage.Primary>
        <Action tone="strong">Approve</Action>
      </DetailPage.Primary>
    </DetailPage>
  );
}
