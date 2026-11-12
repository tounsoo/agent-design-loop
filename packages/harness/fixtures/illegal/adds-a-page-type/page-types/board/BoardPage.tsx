import type { ReactNode } from "react";
import { Stack, Text } from "../../../../product/catalog";

/** Board shell: a second collection, with the collection shell's slots. */
function BoardPageRoot({ children }: { state: string; children: ReactNode }) {
  return <Stack.Root data-page="board">{children}</Stack.Root>;
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

export const BoardPage = Object.assign(BoardPageRoot, { Heading, Description, Body });
