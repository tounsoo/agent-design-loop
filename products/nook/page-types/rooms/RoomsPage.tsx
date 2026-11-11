import { Children, isValidElement, type ReactNode } from "react";
import { Stack, Text } from "../../catalog";

/**
 * Rooms page type: the free rooms to choose from. Slots: title, intro, and
 * the list. The list's ready body is a content layout; loading, no rooms and
 * an error render in the list as the catalog's status parts. This shell has
 * no primary-action slot: choosing a room opens its booking page.
 */

export function Title({ children }: { children: ReactNode }) {
  return <Text.Root as="h1">{children}</Text.Root>;
}

export function Intro({ children }: { children: ReactNode }) {
  return (
    <Text.Root as="p" tone="muted">
      {children}
    </Text.Root>
  );
}

export function List({ children }: { children: ReactNode }) {
  return (
    <Stack.Root data-slot="list" gap="normal">
      {children}
    </Stack.Root>
  );
}

function slot(children: ReactNode, type: unknown): ReactNode {
  return Children.toArray(children).find((child) => isValidElement(child) && child.type === type) ?? null;
}

function RoomsPageRoot({ children, state }: { children: ReactNode; state: string }) {
  return (
    <Stack.Root className="rooms-page" data-page="rooms" data-state={state} gap="spacious">
      <Stack.Root gap="condensed">
        {slot(children, Title)}
        {slot(children, Intro)}
      </Stack.Root>
      {slot(children, List)}
    </Stack.Root>
  );
}

export const RoomsPage = Object.assign(RoomsPageRoot, { Title, Intro, List });
