import { Button, Disclosure } from "../../product/catalog";
import { DetailPage } from "../../product/page-types/detail";
import { ApproveAction } from "./ApproveAction";

/** Illegal: the primary Approve is behind the Line items disclosure, through a component from another file. */
export function HiddenApprove() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Disclosure.Root>
          <Disclosure.Summary>Line items</Disclosure.Summary>
          <ApproveAction />
        </Disclosure.Root>
      </DetailPage.Body>
      <DetailPage.Secondary>
        <Button.Root variant="secondary">Request changes</Button.Root>
      </DetailPage.Secondary>
    </DetailPage>
  );
}
