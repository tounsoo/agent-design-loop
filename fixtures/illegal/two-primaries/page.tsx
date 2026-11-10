import { Button } from "../../../src/catalog";
import { SettingsPage } from "../../../src/page-types/settings";

/** Illegal: two primary buttons in the one primary slot. The slot check must fail. */
export function TwoPrimaries() {
  return (
    <SettingsPage>
      <SettingsPage.Heading>Notification settings</SettingsPage.Heading>
      <SettingsPage.Body>Channels</SettingsPage.Body>
      <SettingsPage.Primary>
        <>
          <Button.Root>Save</Button.Root>
          <Button.Root>Delivery windows</Button.Root>
        </>
      </SettingsPage.Primary>
    </SettingsPage>
  );
}
