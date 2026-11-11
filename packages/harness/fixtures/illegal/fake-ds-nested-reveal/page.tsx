import { Reveal } from "../../fake-ds/catalog";
import { DetailPage } from "../../product/page-types/detail";

/** Illegal under the stand-in adapter: a disclosure inside a disclosure. The depth cap is one. */
export function FakeNestedReveal() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Reveal.Root>
          <Reveal.Label>Line items</Reveal.Label>
          <Reveal.Root>
            <Reveal.Label>Tax</Reveal.Label>
            Sales tax
          </Reveal.Root>
        </Reveal.Root>
      </DetailPage.Body>
    </DetailPage>
  );
}
