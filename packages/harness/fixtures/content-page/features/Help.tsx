import { Button } from "../../product/catalog";
import { HelpPage } from "../page-types/help";

/** Legal: a content page that explains approvals, with a secondary link back and no primary action. */
export function Help() {
  return (
    <HelpPage>
      <HelpPage.Heading>How approvals work</HelpPage.Heading>
      <HelpPage.Body>
        An invoice waits on you until you approve it or ask for changes.
        <Button.Root variant="secondary">Back to invoices</Button.Root>
      </HelpPage.Body>
    </HelpPage>
  );
}
