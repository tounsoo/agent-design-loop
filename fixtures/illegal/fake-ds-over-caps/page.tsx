import { Action, Ask, Reveal } from "../../fake-ds/catalog";
import { DetailPage } from "../../product/page-types/detail";

/**
 * Illegal under the stand-in adapter: two disclosures and two questions in the
 * open on one page, and a strong action inside a disclosure. The disclosure
 * cap, the question cap and priority must each fail.
 */
export function FakeOverCaps() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Reveal.Root>
          <Reveal.Label>Line items</Reveal.Label>
          <Action tone="strong">Approve</Action>
        </Reveal.Root>
        <Reveal.Root>
          <Reveal.Label>History</Reveal.Label>
          Paid in May
        </Reveal.Root>
        <Ask label="Approval note" />
        <Ask label="What should change?" />
      </DetailPage.Body>
    </DetailPage>
  );
}
