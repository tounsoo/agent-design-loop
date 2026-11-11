import type { ReactNode } from "react";
import { Stack } from "../../catalog";

/** The fixture product's one chrome layout. */
export function AppShell({ children }: { children: ReactNode }) {
  return <Stack.Root>{children}</Stack.Root>;
}
