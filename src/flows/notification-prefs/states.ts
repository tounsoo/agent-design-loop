export const modeledStates = ["loading", "empty", "error", "ready", "prefs-saved"] as const;

export type ModeledState = (typeof modeledStates)[number];

export const channels = ["email", "push", "digest"] as const;

export type ChannelId = (typeof channels)[number];

export const channelLabels: Record<ChannelId, string> = {
  email: "Email",
  push: "Push",
  digest: "Weekly digest",
};

export const deliveryWindows = ["morning", "afternoon", "evening"] as const;

export type DeliveryWindowId = (typeof deliveryWindows)[number];

export const deliveryWindowLabels: Record<DeliveryWindowId, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export type Prefs = {
  readonly channels: Readonly<Record<ChannelId, boolean>>;
  readonly deliveryWindow: DeliveryWindowId;
};

export const samplePrefs: Prefs = {
  channels: { email: true, push: false, digest: false },
  deliveryWindow: "morning",
};

export const loadErrorMessage = "Couldn't load notification preferences.";

export type FlowState =
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "ready";
      readonly prefs: Prefs;
      readonly deliveryOpen: boolean;
    }
  | { readonly status: "prefs-saved"; readonly prefs: Prefs };

export type FlowEvent =
  | { readonly type: "loaded"; readonly prefs: Prefs | null }
  | { readonly type: "failed"; readonly message: string }
  | { readonly type: "retry" }
  | { readonly type: "set-channel"; readonly channel: ChannelId; readonly checked: boolean }
  | { readonly type: "open-delivery" }
  | { readonly type: "close-delivery" }
  | { readonly type: "set-window"; readonly window: DeliveryWindowId }
  | { readonly type: "save" };

export function isChannelId(value: string): value is ChannelId {
  return (channels as readonly string[]).includes(value);
}

export function isDeliveryWindowId(value: string): value is DeliveryWindowId {
  return (deliveryWindows as readonly string[]).includes(value);
}

export function isModeledState(value: string): value is ModeledState {
  return (modeledStates as readonly string[]).includes(value);
}
