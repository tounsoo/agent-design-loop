import { DetailPage } from "../../../src/page-types/detail";
import { History } from "./history";
import { LineItems } from "./line-items";

/**
 * Illegal: two disclosures on one detail page. Each file holds one, so a
 * per-file count passes. The cap is per page, so the check must fail.
 */
export function TwoDisclosures() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <LineItems />
        <History />
      </DetailPage.Body>
    </DetailPage>
  );
}
