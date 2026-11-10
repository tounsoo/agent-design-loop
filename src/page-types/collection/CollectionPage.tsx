import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Card, Stack, Text } from "../../catalog";

function isSlot(node: ReactNode, slot: unknown): boolean {
  return isValidElement(node) && node.type === slot;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text.Root as="h1">{children}</Text.Root>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Stack.Root gap="normal">{children}</Stack.Root>;
}

function requireOne(items: readonly ReactNode[], slot: unknown, name: string): ReactElement {
  const matches = items.filter((item) => isSlot(item, slot));
  if (matches.length !== 1) {
    throw new Error(`CollectionPage requires exactly one ${name} slot, found ${matches.length}.`);
  }
  const match = matches[0];
  if (!isValidElement(match)) {
    throw new Error(`CollectionPage ${name} slot is missing.`);
  }
  return match;
}

/**
 * Approval-queue shell. Callers fill heading and body.
 * The queue chooses one invoice. It has no primary-action slot.
 */
function CollectionPageRoot({ children, state }: { children: ReactNode; state: string }) {
  const items = Children.toArray(children);
  const heading = requireOne(items, Heading, "Heading");
  const body = requireOne(items, Body, "Body");

  return (
    <Card.Root data-page="collection" data-state={state}>
      <Card.Header>{heading}</Card.Header>
      <Card.Body>{body}</Card.Body>
    </Card.Root>
  );
}

export const CollectionPage = Object.assign(CollectionPageRoot, {
  Heading,
  Body,
});
