import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Button, Card, Stack, Text } from "../../catalog";

function isSlot(node: ReactNode, slot: unknown): boolean {
  return isValidElement(node) && node.type === slot;
}

function countButtons(node: ReactNode): number {
  if (node == null || typeof node === "boolean") return 0;
  if (Array.isArray(node)) return node.reduce((total, child) => total + countButtons(child), 0);
  if (!isValidElement(node)) return 0;
  const props = node.props as { children?: ReactNode };
  const self = node.type === Button.Root ? 1 : 0;
  return self + countButtons(props.children);
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text.Root as="h1">{children}</Text.Root>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Stack.Root gap="normal">{children}</Stack.Root>;
}

export function Primary({ children }: { children: ReactElement }) {
  const buttons = countButtons(children);
  if (buttons !== 1) {
    throw new Error(
      `settings primary slot accepts exactly one primary button, found ${buttons}.`,
    );
  }
  return (
    <Stack.Root data-slot="primary" direction="row" justify="end">
      {children}
    </Stack.Root>
  );
}

export function Secondary({ children }: { children: ReactNode }) {
  return (
    <Stack.Root data-slot="secondary" gap="normal">
      {children}
    </Stack.Root>
  );
}

function requireOne(items: readonly ReactNode[], slot: unknown, name: string): ReactElement {
  const matches = items.filter((item) => isSlot(item, slot));
  if (matches.length !== 1) {
    throw new Error(`SettingsPage requires exactly one ${name} slot, found ${matches.length}.`);
  }
  const match = matches[0];
  if (!isValidElement(match)) {
    throw new Error(`SettingsPage ${name} slot is missing.`);
  }
  return match;
}

/**
 * Settings shell. Callers fill named slots. The shell owns chrome and spacing.
 * The primary slot accepts exactly one primary button.
 */
function SettingsPageRoot({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const heading = requireOne(items, Heading, "Heading");
  const body = requireOne(items, Body, "Body");
  const primary = requireOne(items, Primary, "Primary");
  const secondary = items.filter((item) => isSlot(item, Secondary));
  if (secondary.length > 1) {
    throw new Error(`SettingsPage accepts at most one Secondary slot, found ${secondary.length}.`);
  }

  return (
    <Card.Root data-page="settings">
      <Card.Header>{heading}</Card.Header>
      <Card.Body>
        <Stack.Root gap="spacious">
          {body}
          {secondary[0]}
        </Stack.Root>
      </Card.Body>
      <Card.Footer>{primary}</Card.Footer>
    </Card.Root>
  );
}

export const SettingsPage = Object.assign(SettingsPageRoot, {
  Heading,
  Body,
  Primary,
  Secondary,
});
