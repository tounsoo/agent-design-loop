import type { ReactElement, ReactNode } from "react";
import { Stack, Text } from "../../../product/catalog";

/** Detail shell: heading, body, one secondary area and one primary slot. */
function DetailPageRoot({ children }: { state: string; children: ReactNode }) {
  return <Stack.Root data-page="detail">{children}</Stack.Root>;
}

function Heading({ children }: { children: ReactNode }) {
  return <Text.Root as="h1">{children}</Text.Root>;
}

function Body({ children }: { children: ReactNode }) {
  return <Stack.Root>{children}</Stack.Root>;
}

function Secondary({ children }: { children: ReactNode }) {
  return <Stack.Root>{children}</Stack.Root>;
}

function Primary({ children }: { children: ReactElement }) {
  return <Stack.Root>{children}</Stack.Root>;
}

export const DetailPage = Object.assign(DetailPageRoot, { Heading, Body, Secondary, Primary });
