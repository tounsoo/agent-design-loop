import { useState, type FormEvent } from "react";
import { Alert, Button, Form, Stack } from "../../catalog";
import {
  initialFlowState,
  transition,
  type ChannelId,
  type DeliveryWindowId,
  type ModeledState,
} from "../../flows/notification-prefs";
import { SettingsPage } from "../../page-types/settings";
import { DeliveryWindows, renderBody, type BodyActions } from "./views";

export function NotificationSettings({ preview = null }: { preview?: ModeledState | null }) {
  const [state, setState] = useState(() => initialFlowState(preview));

  const actions: BodyActions = {
    retry: () => setState((current) => transition(current, { type: "retry" })),
    setChannel: (channel: ChannelId, checked: boolean) =>
      setState((current) => transition(current, { type: "set-channel", channel, checked })),
    setDeliveryOpen: (open: boolean) =>
      setState((current) => transition(current, { type: open ? "open-delivery" : "close-delivery" })),
    setWindow: (window: DeliveryWindowId) =>
      setState((current) => transition(current, { type: "set-window", window })),
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => transition(current, { type: "save" }));
  }

  const prefs = state.status === "ready" || state.status === "prefs-saved" ? state.prefs : null;
  const deliveryOpen = state.status === "ready" ? state.deliveryOpen : false;

  return (
    <Form.Root data-state={state.status} onSubmit={onSubmit}>
      <SettingsPage>
        <SettingsPage.Heading>Notification settings</SettingsPage.Heading>
        <SettingsPage.Body>
          <Stack.Root gap="normal" role="status">
            {state.status === "prefs-saved" ? (
              <Alert.Root role="none" tone="success">
                <Alert.Title>Preferences saved</Alert.Title>
              </Alert.Root>
            ) : null}
          </Stack.Root>
          {renderBody(state, actions)}
        </SettingsPage.Body>
        <SettingsPage.Secondary>
          {prefs ? (
            <DeliveryWindows
              open={deliveryOpen}
              prefs={prefs}
              onSetWindow={actions.setWindow}
              onToggle={actions.setDeliveryOpen}
            />
          ) : null}
        </SettingsPage.Secondary>
        <SettingsPage.Primary>
          <Button.Root disabled={state.status !== "ready"} type="submit">
            Save
          </Button.Root>
        </SettingsPage.Primary>
      </SettingsPage>
    </Form.Root>
  );
}
