import { useState } from "react";
import { Button, Disclosure, Field, Label, Stack, Text } from "../catalog";
import { DetailPage } from "../page-types/detail";

type Status = "ready" | "invoice-approved" | "changes-requested";

/** Legal: one primary action, one secondary action, Line items behind a disclosure, and one question in the open. */
export function Detail({ status }: { status: Status }) {
  const [reason, setReason] = useState("");
  return (
    <DetailPage state={status}>
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        {status === "invoice-approved" ? <Text.Root role="status">Invoice approved</Text.Root> : null}
        <Disclosure.Root>
          <Disclosure.Summary>Line items</Disclosure.Summary>
          Paper stock
        </Disclosure.Root>
        <Stack.Root>
          <Label.Root htmlFor="change-reason">What should change?</Label.Root>
          <Field.Root id="change-reason">
            <Field.Textarea rows={3} value={reason} onValueChange={setReason} />
          </Field.Root>
        </Stack.Root>
      </DetailPage.Body>
      <DetailPage.Secondary>
        <Button.Root variant="secondary">Request changes</Button.Root>
      </DetailPage.Secondary>
      <DetailPage.Primary>
        <Button.Root disabled={status === "changes-requested"}>Approve</Button.Root>
      </DetailPage.Primary>
    </DetailPage>
  );
}
