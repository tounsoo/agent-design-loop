import { Disclosure, Text } from "../../product/catalog";

export function LineItems() {
  return (
    <Disclosure.Root>
      <Disclosure.Summary>Line items</Disclosure.Summary>
      <Text.Root>Paper stock</Text.Root>
    </Disclosure.Root>
  );
}
