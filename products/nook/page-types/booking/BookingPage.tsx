import { Children, isValidElement, type ReactNode } from "react";
import { Stack, Text } from "../../catalog";

/**
 * Booking page type: one room being booked. Slots: back, title, facts, body,
 * an alternate action, and the one primary action. lint:slots reads the
 * primary slot's name, Action, from the harness config.
 */

export function Back({ children }: { children: ReactNode }) {
  return <div data-slot="back">{children}</div>;
}

export function Title({ children }: { children: ReactNode }) {
  // The top bar moves focus here on a page change.
  return (
    <Text.Root as="h1" tabIndex={-1}>
      {children}
    </Text.Root>
  );
}

export function Facts({ children }: { children: ReactNode }) {
  return (
    <Text.Root as="p" tone="muted">
      {children}
    </Text.Root>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return <Stack.Root gap="normal">{children}</Stack.Root>;
}

export function Alternate({ children }: { children: ReactNode }) {
  return <div data-slot="alternate">{children}</div>;
}

export function Action({ children }: { children: ReactNode }) {
  return <div data-slot="action">{children}</div>;
}

function slot(children: ReactNode, type: unknown): ReactNode {
  return Children.toArray(children).find((child) => isValidElement(child) && child.type === type) ?? null;
}

function BookingPageRoot({ children, state }: { children: ReactNode; state: string }) {
  return (
    <Stack.Root className="booking-page" data-page="booking" data-state={state} gap="spacious">
      {slot(children, Back)}
      <Stack.Root gap="condensed">
        {slot(children, Title)}
        {slot(children, Facts)}
      </Stack.Root>
      {slot(children, Body)}
      <Stack.Root align="center" direction="row" gap="normal" justify="end">
        {slot(children, Alternate)}
        {slot(children, Action)}
      </Stack.Root>
    </Stack.Root>
  );
}

export const BookingPage = Object.assign(BookingPageRoot, { Back, Title, Facts, Body, Alternate, Action });
