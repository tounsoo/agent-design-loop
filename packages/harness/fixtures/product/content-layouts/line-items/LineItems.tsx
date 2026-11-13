import { Disclosure } from "../../catalog";

/** The fixture product's line items: a detail page's body section behind a disclosure, the one disclosed_sections names. */
export function LineItems() {
  return (
    <Disclosure.Root>
      <Disclosure.Summary>Line items</Disclosure.Summary>
      Paper stock
    </Disclosure.Root>
  );
}
