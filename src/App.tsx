import { useState } from "react";
import { DensityProvider, Stack, ThemeProvider } from "./catalog";
import { NotificationSettings } from "./features/notification-settings";
import { readPreviewState, StatePreviewLinks } from "./harness/state-preview";

export function App() {
  const [preview] = useState(() => readPreviewState(window.location.search));
  return (
    <ThemeProvider appearance="system">
      <DensityProvider density="comfortable">
        <Stack.Root gap="spacious">
          <StatePreviewLinks active={preview} />
          <NotificationSettings preview={preview} />
        </Stack.Root>
      </DensityProvider>
    </ThemeProvider>
  );
}
