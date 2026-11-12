import type { ReactNode } from "react";
import { Stack, Text } from "../../../product/catalog";

/** Help shell: a heading and a body that explains. It has no primary-action slot. */
function HelpPageRoot({ children }: { children: ReactNode }) {
  return <Stack.Root data-page="help">{children}</Stack.Root>;
}

function Heading({ children }: { children: ReactNode }) {
  return <Text.Root as="h1">{children}</Text.Root>;
}

function Body({ children }: { children: ReactNode }) {
  return <Stack.Root>{children}</Stack.Root>;
}

export const HelpPage = Object.assign(HelpPageRoot, { Heading, Body });
