import { useState } from "react";
import { Button, Text } from "../catalog";
import { LineItems } from "../content-layouts/line-items";
import { TextQuestion } from "../content-layouts/text-question";
import { DetailPage } from "../page-types/detail";

type Status = "ready" | "invoice-approved" | "changes-requested";

/** Legal: one primary action, one secondary action, Line items behind a disclosure, and one question in the open, its body built from content layouts. */
export function Detail({ status }: { status: Status }) {
  const [reason, setReason] = useState("");
  return (
    <DetailPage state={status}>
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        {status === "invoice-approved" ? <Text.Root role="status">Invoice approved</Text.Root> : null}
        <LineItems />
        <TextQuestion label="What should change?" value={reason} onValueChange={setReason} />
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
