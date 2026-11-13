import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Stack, Text } from "../../catalog";

/**
 * Profile page type. One record's facts and what belongs to it, with no
 * primary action: the config names it under shells.content, so a primary
 * button anywhere on the page fails check:one-thing. Slots: breadcrumbs,
 * heading, meta and body. Breadcrumbs and heading are its chrome; meta and
 * body hold registered content layouts, which render their own section
 * headings under the page's h1.
 */

function isSlot(node: ReactNode, slot: unknown): boolean {
  return isValidElement(node) && node.type === slot;
}

export function Breadcrumbs({ children }: { children: ReactNode }) {
  return <div data-slot="breadcrumbs">{children}</div>;
}

export function Heading({ children }: { children: ReactNode }) {
  // The app shell moves focus here on a page change.
  return (
    <Text.Root as="h1" tabIndex={-1}>
      {children}
    </Text.Root>
  );
}

export function Meta({ children }: { children: ReactNode }) {
  return <div data-slot="meta">{children}</div>;
}

export function Body({ children }: { children: ReactNode }) {
  return (
    <Stack.Root data-slot="body" gap="spacious">
      {children}
    </Stack.Root>
  );
}

function requireOne(items: readonly ReactNode[], slot: unknown, name: string): ReactElement {
  const matches = items.filter((item) => isSlot(item, slot));
  if (matches.length !== 1) {
    throw new Error(`ProfilePage requires exactly one ${name} slot, found ${matches.length}.`);
  }
  const match = matches[0];
  if (!isValidElement(match)) {
    throw new Error(`ProfilePage ${name} slot is missing.`);
  }
  return match;
}

function optional(items: readonly ReactNode[], slot: unknown, name: string): ReactElement | null {
  const matches = items.filter((item) => isSlot(item, slot));
  if (matches.length > 1) {
    throw new Error(`ProfilePage accepts at most one ${name} slot, found ${matches.length}.`);
  }
  const match = matches[0];
  return isValidElement(match) ? match : null;
}

function ProfilePageRoot({ children, state }: { children: ReactNode; state: string }) {
  const items = Children.toArray(children);
  const breadcrumbs = optional(items, Breadcrumbs, "Breadcrumbs");
  const heading = requireOne(items, Heading, "Heading");
  const meta = optional(items, Meta, "Meta");
  const body = requireOne(items, Body, "Body");

  return (
    <Stack.Root className="profile-page" data-page="profile" data-state={state} gap="spacious">
      {breadcrumbs}
      <Stack.Root gap="condensed">
        {heading}
        {meta}
      </Stack.Root>
      {body}
    </Stack.Root>
  );
}

export const ProfilePage = Object.assign(ProfilePageRoot, {
  Breadcrumbs,
  Heading,
  Meta,
  Body,
});
