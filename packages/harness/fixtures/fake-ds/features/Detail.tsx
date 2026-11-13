import { Action } from "../catalog";
import { LineItems } from "../content-layouts/line-items";
import { Question } from "../content-layouts/question";
import { DetailPage } from "../../product/page-types/detail";

/**
 * Legal under the stand-in adapter: one strong action, one quiet action, line
 * items behind a disclosure, and one question in the open, the body built from
 * the stand-in product's content layouts. The second question sits inside the
 * disclosure, so it is not visible first.
 */
export function FakeDetail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <LineItems />
        <Question label="What should change?" />
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
