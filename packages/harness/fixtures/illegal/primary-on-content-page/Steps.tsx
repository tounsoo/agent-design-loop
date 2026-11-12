import { Button } from "../../product/catalog";

/** The steps of an approval, with a primary action that does not belong on a page that only explains. */
export function Steps() {
  return (
    <>
      An invoice waits on you until you approve it or ask for changes.
      <Button.Root>Start approving</Button.Root>
    </>
  );
}
