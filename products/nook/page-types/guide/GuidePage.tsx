import type { ReactNode } from "react";
import { Stack, Text } from "../../catalog";

/** Guide page type: a page that explains how booking works. Slots: title and body. It has no primary-action slot. */
function GuidePageRoot({ children }: { children: ReactNode }) {
  return (
    <Stack.Root data-page="guide" gap="normal">
      {children}
    </Stack.Root>
  );
}

function Title({ children }: { children: ReactNode }) {
  return (
    <Text.Root as="h1" tabIndex={-1}>
      {children}
    </Text.Root>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <Stack.Root gap="condensed">{children}</Stack.Root>;
}

export const GuidePage = Object.assign(GuidePageRoot, { Title, Body });
