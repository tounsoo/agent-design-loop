import { Button, Disclosure, Stack, Text } from "../../product/catalog";
import { DetailPage } from "../../product/page-types/detail";

const lines = ["Paper stock", "Toner"];

/** Illegal: a status part in the body holds disclosures a map builds, so a block hides inside an expression. */
export function Detail() {
  return (
    <DetailPage state="ready">
      <DetailPage.Heading>Northwind Office Supply</DetailPage.Heading>
      <DetailPage.Body>
        <Stack.Root gap="normal">
          {lines.map((line) => (
            <Disclosure.Root key={line}>
              <Disclosure.Summary>{line}</Disclosure.Summary>
              <Text.Root>One box</Text.Root>
            </Disclosure.Root>
          ))}
        </Stack.Root>
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
