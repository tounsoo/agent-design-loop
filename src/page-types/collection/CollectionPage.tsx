import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { DensityProvider, Stack, Text } from "../../catalog";
import { usePageHeading } from "../../layouts/app-shell";

/**
 * Collection page type. Encodes the Todae filter bar and data table recipes
 * as one shell. Callers fill the slots. The shell owns the chrome.
 *
 * https://todae.omsoo.design/recipes/filter-bar
 * https://todae.omsoo.design/recipes/data-table
 *
 * The queue chooses one record. This shell has no primary-action slot.
 * Compact density is the payables queue: more rows in the same frame.
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

export function Toolbar({ children }: { children: ReactNode }) {
  return <div data-slot="toolbar">{children}</div>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Stack.Root gap="normal">{children}</Stack.Root>;
}

export function Pagination({ children }: { children: ReactNode }) {
  return <div data-slot="pagination">{children}</div>;
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
  const toolbar = optional(items, Toolbar, "Toolbar");
  const body = requireOne(items, Body, "Body");
  const pagination = optional(items, Pagination, "Pagination");

  return (
    <DensityProvider className="collection-page" density="compact">
      <Stack.Root className="collection-page" data-page="collection" data-state={state} gap="spacious">
        <Stack.Root gap="condensed">
          {heading}
          {description}
        </Stack.Root>
        {toolbar}
        {body}
        {pagination}
      </Stack.Root>
    </DensityProvider>
  );
}

export const CollectionPage = Object.assign(CollectionPageRoot, {
  Heading,
  Description,
  Toolbar,
  Body,
  Pagination,
});
