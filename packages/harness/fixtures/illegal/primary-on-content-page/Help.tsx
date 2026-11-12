import { Button } from "../../product/catalog";
import { HelpPage } from "../../content-page/page-types/help";
import { Steps } from "./Steps";

/** Illegal: a content page that holds a primary action, here in a component it renders. */
export function Help() {
  return (
    <HelpPage>
      <HelpPage.Heading>How approvals work</HelpPage.Heading>
      <HelpPage.Body>
        <Steps />
        <Button.Root variant="secondary">Back to invoices</Button.Root>
      </HelpPage.Body>
    </HelpPage>
  );
}
