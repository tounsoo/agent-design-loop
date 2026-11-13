import { Ask, Reveal } from "../../catalog";

/** Line items behind the stand-in disclosure, with a second question inside it, so it is not visible first. */
export function LineItems() {
  return (
    <Reveal.Root>
      <Reveal.Label>Line items</Reveal.Label>
      Paper stock
      <Ask label="Which line is wrong?" />
    </Reveal.Root>
  );
}
