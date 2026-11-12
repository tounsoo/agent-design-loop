import { Button } from "../../product/catalog";

/** The steps of an approval, with a button whose variant is computed, so it could be primary on a page that only explains. */
export function Steps({ ready = false }: { ready?: boolean }) {
  return (
    <>
      An invoice waits on you until you approve it or ask for changes.
      <Button.Root variant={ready ? "primary" : "secondary"}>Start approving</Button.Root>
    </>
  );
}
