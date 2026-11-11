import { Button, Disclosure, Field, Label } from "../catalog";
import { DetailPage } from "../page-types/detail";

/** Legal: one primary action, one secondary action, Line items behind a disclosure, and one question in the open. */
export function Detail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Disclosure.Root>
          <Disclosure.Summary>Line items</Disclosure.Summary>
          Paper stock
        </Disclosure.Root>
        <Field.Root>
          <Label>What should change?</Label>
        </Field.Root>
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
