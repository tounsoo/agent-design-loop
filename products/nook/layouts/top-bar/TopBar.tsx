import type { ReactNode } from "react";
import { Stack, Text } from "../../catalog";

/** Nook's frame: a bar with the product name over one centered page. No navigation: Nook does one job. */
export function TopBar({ children }: { children: ReactNode }) {
  return (
    <Stack.Root gap="none">
      <Stack.Root as="header" align="baseline" className="top-bar" direction="row" gap="condensed">
        <Text.Root as="span" weight="bold">
          Nook
        </Text.Root>
        <Text.Root as="span" tone="muted">
          Room booking
        </Text.Root>
      </Stack.Root>
      <main className="top-bar-main">{children}</main>
    </Stack.Root>
  );
}
