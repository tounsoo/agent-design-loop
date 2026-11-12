import type { ReactNode } from "react";
import { Button, Nav, Stack, Text } from "../../catalog";
import type { Place } from "../../flows/booking/states";

const places: readonly { readonly place: Place; readonly label: string }[] = [
  { place: "rooms", label: "Rooms" },
  { place: "waitlist", label: "Waitlist" },
];

/**
 * Nook's frame: a bar with the product name and its two places, Rooms and
 * Waitlist, over one centered page. `current` is marked for a screen reader;
 * `locked` turns both off where the flow keeps the person on the page.
 */
export function TopBar({
  current,
  locked,
  onNavigate,
  children,
}: {
  current: Place;
  locked: boolean;
  onNavigate: (place: Place) => void;
  children: ReactNode;
}) {
  return (
    <Stack.Root gap="none">
      <Stack.Root as="header" align="center" className="top-bar" direction="row" gap="normal">
        <Stack.Root align="baseline" direction="row" gap="condensed">
          <Text.Root as="span" weight="bold">
            Nook
          </Text.Root>
          <Text.Root as="span" tone="muted">
            Room booking
          </Text.Root>
        </Stack.Root>
        <Nav.Root aria-label="Main" className="top-bar-nav">
          <Stack.Root direction="row" gap="condensed">
            {places.map(({ place, label }) => (
              <span className="top-bar-place" key={place}>
                <Button.Root
                  aria-current={place === current ? "page" : undefined}
                  disabled={locked}
                  type="button"
                  variant="ghost"
                  onClick={() => onNavigate(place)}
                >
                  {label}
                </Button.Root>
              </span>
            ))}
          </Stack.Root>
        </Nav.Root>
      </Stack.Root>
      <main className="top-bar-main">{children}</main>
    </Stack.Root>
  );
}
