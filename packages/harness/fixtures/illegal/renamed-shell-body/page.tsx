import { Button, Disclosure, Text } from "../../product/catalog";
import { DetailPage as Page } from "../../product/page-types/detail";

/** Illegal: the shell is imported under another name, and its body holds a disclosure the feature wrote. */
export function Detail() {
  return (
    <Page state="ready">
      <Page.Heading>Northwind Office Supply</Page.Heading>
      <Page.Body>
        <Disclosure.Root>
          <Disclosure.Summary>Line items</Disclosure.Summary>
          <Text.Root>Paper stock</Text.Root>
        </Disclosure.Root>
      </Page.Body>
      <Page.Secondary>
        <Button.Root variant="secondary">Request changes</Button.Root>
      </Page.Secondary>
      <Page.Primary>
        <Button.Root>Approve</Button.Root>
      </Page.Primary>
    </Page>
  );
}
