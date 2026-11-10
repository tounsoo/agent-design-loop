import { useState } from "react";
import { DensityProvider, Stack, ThemeProvider } from "./catalog";
import { InvoiceApproval } from "./features/invoice-approval";
import { readPreview, StatePreviewLinks } from "./harness/state-preview";

export function App() {
  const [preview] = useState(() => readPreview(window.location.search));
  return (
    <ThemeProvider appearance="system">
      <DensityProvider density="comfortable">
        <Stack.Root gap="spacious">
          <StatePreviewLinks preview={preview} />
          <InvoiceApproval preview={preview} />
        </Stack.Root>
      </DensityProvider>
    </ThemeProvider>
  );
}
