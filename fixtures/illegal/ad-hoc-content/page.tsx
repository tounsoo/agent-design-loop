import { Card, Stack } from "../../../src/catalog";
import { CollectionPage } from "../../../src/page-types/collection";

/**
 * Illegal: a status board inside the collection body, with page CSS, is not
 * a registered content layout. Loading, empty, and error may stay in the shell.
 */
export function TrackingBoard() {
  const ready = true;
  return (
    <CollectionPage state="ready">
      <CollectionPage.Heading>Tracking</CollectionPage.Heading>
      <CollectionPage.Body>
        {ready ? (
          <Stack.Root className="tracking-board">
            <Card.Root>
              <Card.Body>INV-1930</Card.Body>
            </Card.Root>
          </Stack.Root>
        ) : null}
      </CollectionPage.Body>
    </CollectionPage>
  );
}
