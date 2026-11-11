import { Action, Ask, Reveal } from "../catalog";
import { DetailPage } from "../../product/page-types/detail";

/**
 * Legal under the stand-in adapter: one strong action, one quiet action, line
 * items behind a disclosure, and one question in the open. The second question
 * sits inside the disclosure, so it is not visible first.
 */
export function FakeDetail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Reveal.Root>
          <Reveal.Label>Line items</Reveal.Label>
          Paper stock
          <Ask label="Which line is wrong?" />
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
