import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Button, Stack, Text } from "../../catalog";
import { usePageHeading } from "../../layouts/app-shell";

/**
 * Detail page type. One record. Slots: breadcrumbs, heading, meta, body,
 * primary, and secondary. Record fields use DataList.
 *
 * Primary is optional at runtime. Invoice detail fills it with Approve, and
 * the slot check still requires that button in the feature source. A vendor
 * record leaves the slot out: no ranked action belongs on it, and Approve
 * stays on the invoice.
 */

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

export function Breadcrumbs({ children }: { children: ReactNode }) {
  return <div data-slot="breadcrumbs">{children}</div>;
}

export function Heading({ children }: { children: ReactNode }) {
  const headingRef = usePageHeading();
  return (
    <Text.Root as="h1" ref={headingRef ?? undefined} tabIndex={-1}>
      {children}
    </Text.Root>
  );
}

export function Meta({ children }: { children: ReactNode }) {
  return <div data-slot="meta">{children}</div>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Stack.Root gap="normal">{children}</Stack.Root>;
}

export function Primary({ children }: { children: ReactElement }) {
  const buttons = countButtons(children);
  if (buttons !== 1) {
    throw new Error(`detail primary slot accepts exactly one primary button, found ${buttons}.`);
  }
  return (
    <Stack.Root data-slot="primary" direction="row" justify="end">
      {children}
    </Stack.Root>
  );
}

export function Secondary({ children }: { children: ReactNode }) {
  return (
    <Stack.Root data-slot="secondary" direction="row" gap="normal">
      {children}
    </Stack.Root>
  );
}

function requireOne(items: readonly ReactNode[], slot: unknown, name: string): ReactElement {
  const matches = items.filter((item) => isSlot(item, slot));
  if (matches.length !== 1) {
    throw new Error(`DetailPage requires exactly one ${name} slot, found ${matches.length}.`);
  }
  const match = matches[0];
  if (!isValidElement(match)) {
    throw new Error(`DetailPage ${name} slot is missing.`);
  }
  return match;
}

function optional(items: readonly ReactNode[], slot: unknown, name: string): ReactElement | null {
  const matches = items.filter((item) => isSlot(item, slot));
  if (matches.length > 1) {
    throw new Error(`DetailPage accepts at most one ${name} slot, found ${matches.length}.`);
  }
  const match = matches[0];
  return isValidElement(match) ? match : null;
}

function DetailPageRoot({ children, state }: { children: ReactNode; state: string }) {
  const items = Children.toArray(children);
  const breadcrumbs = optional(items, Breadcrumbs, "Breadcrumbs");
  const heading = requireOne(items, Heading, "Heading");
  const meta = optional(items, Meta, "Meta");
  const body = requireOne(items, Body, "Body");
  const primary = optional(items, Primary, "Primary");
  const secondary = optional(items, Secondary, "Secondary");

  return (
    <Stack.Root className="detail-page" data-page="detail" data-state={state} gap="spacious">
      {breadcrumbs}
      <Stack.Root gap="condensed">
        {heading}
        {meta}
      </Stack.Root>
      {body}
      {primary || secondary ? (
        <Stack.Root align="center" className="detail-actions" direction="row" gap="normal" justify="end">
          {secondary}
          {primary}
        </Stack.Root>
      ) : null}
    </Stack.Root>
  );
}

export const DetailPage = Object.assign(DetailPageRoot, {
  Breadcrumbs,
  Heading,
  Meta,
  Body,
  Primary,
  Secondary,
});
