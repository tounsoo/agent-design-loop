import type { ReactNode } from "react";
import { Stack, Text } from "../../../../product/catalog";

/** Collection shell: heading, description and body. It has no primary-action slot. */
function CollectionPageRoot({ children }: { state: string; children: ReactNode }) {
  return <Stack.Root data-page="collection">{children}</Stack.Root>;
}

function Heading({ children }: { children: ReactNode }) {
  return <Text.Root as="h1">{children}</Text.Root>;
}

function Description({ children }: { children: ReactNode }) {
  return <Text.Root as="p">{children}</Text.Root>;
}

function Body({ children }: { children: ReactNode }) {
  return <Stack.Root>{children}</Stack.Root>;
}

export const CollectionPage = Object.assign(CollectionPageRoot, { Heading, Description, Body });
