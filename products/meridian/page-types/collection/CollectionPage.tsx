import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Stack, Text } from "../../catalog";
import { usePageHeading } from "../../layouts/app-shell";

/**
 * Collection page type. Heading, description, and body. The ready body is a
 * content layout; this shell does not own that composition. Loading, empty,
 * and error render in the body and are not content layouts.
 *
 * The queue chooses one record. This shell has no primary-action slot.
 */

function isSlot(node: ReactNode, slot: unknown): boolean {
  return isValidElement(node) && node.type === slot;
}

export function Heading({ children }: { children: ReactNode }) {
  const headingRef = usePageHeading();
  return (
    <Text.Root as="h1" ref={headingRef ?? undefined} tabIndex={-1}>
      {children}
    </Text.Root>
  );
}

export function Description({ children }: { children: ReactNode }) {
  return (
    <Text.Root as="p" tone="muted">
      {children}
    </Text.Root>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return (
    <Stack.Root data-slot="body" gap="normal">
      {children}
    </Stack.Root>
  );
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

function optional(items: readonly ReactNode[], slot: unknown, name: string): ReactElement | null {
  const matches = items.filter((item) => isSlot(item, slot));
  if (matches.length > 1) {
    throw new Error(`CollectionPage accepts at most one ${name} slot, found ${matches.length}.`);
  }
  const match = matches[0];
  return isValidElement(match) ? match : null;
}

function CollectionPageRoot({ children, state }: { children: ReactNode; state: string }) {
  const items = Children.toArray(children);
  const heading = requireOne(items, Heading, "Heading");
  const description = optional(items, Description, "Description");
  const body = requireOne(items, Body, "Body");

  return (
    <Stack.Root className="collection-page" data-page="collection" data-state={state} gap="spacious">
      <Stack.Root gap="condensed">
        {heading}
        {description}
      </Stack.Root>
      {body}
    </Stack.Root>
  );
}

export const CollectionPage = Object.assign(CollectionPageRoot, {
  Heading,
  Description,
  Body,
});
