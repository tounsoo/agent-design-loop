import { Text } from "../../catalog";
import { GuidePage } from "../../page-types";

/** How booking works: a content page with no primary action. */
export function Guide() {
  return (
    <GuidePage>
      <GuidePage.Title>How booking works</GuidePage.Title>
      <GuidePage.Body>
        <Text.Root as="p">Choose a free room, then hold it for 15 minutes or book it.</Text.Root>
      </GuidePage.Body>
    </GuidePage>
  );
}
