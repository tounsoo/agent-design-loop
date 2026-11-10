import { useId, type ReactElement } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Disclosure,
  EmptyState,
  Fieldset,
  Loader,
  RadioGroup,
  Skeleton,
  Stack,
  Text,
  VisuallyHidden,
} from "../../catalog";
import {
  channelLabels,
  channels,
  deliveryWindowLabels,
  deliveryWindows,
  isDeliveryWindowId,
  type ChannelId,
  type DeliveryWindowId,
  type FlowState,
  type ModeledState,
  type Prefs,
} from "../../flows/notification-prefs";

export type BodyActions = {
  retry: () => void;
  setChannel: (channel: ChannelId, checked: boolean) => void;
  setDeliveryOpen: (open: boolean) => void;
  setWindow: (window: DeliveryWindowId) => void;
};

/** States this module renders. A missing member is a type error. */
export const renderedStates = [
  "loading",
  "empty",
  "error",
  "ready",
  "prefs-saved",
] as const satisfies readonly ModeledState[];

type MissingView = Exclude<ModeledState, (typeof renderedStates)[number]>;
type ViewsCovered = MissingView extends never ? true : never;
export const viewsCovered: ViewsCovered = true;

function LoadingBody() {
  return (
    <>
      <VisuallyHidden.Root>Loading notification preferences</VisuallyHidden.Root>
      <Stack.Root aria-hidden="true" gap="normal">
        <Loader.Root aria-label="Loading notification preferences" />
        <Skeleton.Root>
          <Text.Root>Loading notification preferences</Text.Root>
        </Skeleton.Root>
        <Skeleton.Root>
          <Text.Root>Email, push, and the weekly digest</Text.Root>
        </Skeleton.Root>
      </Stack.Root>
    </>
  );
}

function EmptyBody() {
  return (
    <EmptyState.Root>
      <EmptyState.Title as="h2">No notification preferences yet</EmptyState.Title>
      <EmptyState.Description>Nothing is stored for this account.</EmptyState.Description>
    </EmptyState.Root>
  );
}

function ErrorBody({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Stack.Root align="start" gap="normal">
      <Alert.Root tone="critical" role="none">
        <Alert.Title>{message}</Alert.Title>
      </Alert.Root>
      <Button.Root type="button" variant="secondary" onClick={onRetry}>
        Try again
      </Button.Root>
    </Stack.Root>
  );
}

function ReadyBody({
  prefs,
  onSetChannel,
}: {
  prefs: Prefs;
  onSetChannel: BodyActions["setChannel"];
}) {
  return (
    <Fieldset.Root>
      <Fieldset.Legend>Channels</Fieldset.Legend>
      <Stack.Root gap="spacious">
        {channels.map((channel) => (
          <Checkbox.Root
            key={channel}
            checked={prefs.channels[channel]}
            name={`channel-${channel}`}
            onCheckedChange={(checked) => onSetChannel(channel, checked)}
          >
            {channelLabels[channel]}
          </Checkbox.Root>
        ))}
      </Stack.Root>
    </Fieldset.Root>
  );
}

function SavedBody({ prefs }: { prefs: Prefs }) {
  const enabled = channels.filter((channel) => prefs.channels[channel]).map((channel) => channelLabels[channel]);
  return (
    <Stack.Root gap="condensed">
      <Text.Root>{enabled.length > 0 ? `On: ${enabled.join(", ")}.` : "All channels are off."}</Text.Root>
      <Text.Root tone="muted">Delivery window: {deliveryWindowLabels[prefs.deliveryWindow]}.</Text.Root>
    </Stack.Root>
  );
}

export function DeliveryWindows({
  prefs,
  open,
  onToggle,
  onSetWindow,
}: {
  prefs: Prefs;
  open: boolean;
  onToggle: (open: boolean) => void;
  onSetWindow: BodyActions["setWindow"];
}) {
  const captionId = useId();
  return (
    <Disclosure.Root
      open={open}
      onToggle={(event) => {
        onToggle(event.currentTarget.open);
      }}
    >
      <Disclosure.Summary>Delivery windows</Disclosure.Summary>
      <Stack.Root gap="spacious">
        <Text.Root as="span" id={captionId} weight="medium">
          When notifications arrive
        </Text.Root>
        <RadioGroup.Root
          aria-labelledby={captionId}
          name="delivery-window"
          value={prefs.deliveryWindow}
          onValueChange={(value) => {
            if (value != null && isDeliveryWindowId(value)) onSetWindow(value);
          }}
        >
          {deliveryWindows.map((window) => (
            <RadioGroup.Item key={window} value={window}>
              {deliveryWindowLabels[window]}
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </Stack.Root>
    </Disclosure.Root>
  );
}

export function renderBody(state: FlowState, actions: BodyActions): ReactElement {
  switch (state.status) {
    case "loading":
      return <LoadingBody />;
    case "empty":
      return <EmptyBody />;
    case "error":
      return <ErrorBody message={state.message} onRetry={actions.retry} />;
    case "ready":
      return <ReadyBody prefs={state.prefs} onSetChannel={actions.setChannel} />;
    case "prefs-saved":
      return <SavedBody prefs={state.prefs} />;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
