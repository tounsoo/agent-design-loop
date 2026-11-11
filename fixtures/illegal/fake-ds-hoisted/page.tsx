import { Ask, Reveal } from "../../fake-ds/catalog";
import { DetailPage } from "../../product/page-types/detail";

/**
 * Illegal under the stand-in adapter: a disclosure and a question built in a
 * variable outside the shell. No page scope reaches them, so both caps must
 * fail rather than count zero.
 */
export function FakeHoisted() {
  const details = (
    <Reveal.Root>
      <Reveal.Label>Line items</Reveal.Label>
      <Ask label="Which line is wrong?" />
    </Reveal.Root>
  );
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>{details}</DetailPage.Body>
    </DetailPage>
  );
}
