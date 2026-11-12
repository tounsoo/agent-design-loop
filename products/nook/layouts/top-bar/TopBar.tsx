import { useLayoutEffect, useRef, type ReactNode } from "react";
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
 *
 * The bar also owns what a page change tells a screen reader, so a page does
 * not opt in: when `page` changes, focus moves to the new page's h1, which reads
 * its title. A change inside one page, such as a retry or a hold, keeps its
 * own focus. `page` names the page shown, such as "rooms" or "room:harbor".
 */
export function TopBar({
  current,
  locked,
  page,
  onNavigate,
  children,
}: {
  current: Place;
  locked: boolean;
  page: string;
  onNavigate: (place: Place) => void;
  children: ReactNode;
}) {
  const main = useRef<HTMLElement>(null);
  const shown = useRef(page);

  // The first page keeps the browser's own focus.
  useLayoutEffect(() => {
    if (shown.current === page) return;
    shown.current = page;
    const heading = main.current?.querySelector<HTMLElement>("h1");
    if (!heading) {
      main.current?.focus();
      return;
    }
    if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    heading.focus();
  }, [page]);

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
      <main ref={main} className="top-bar-main" tabIndex={-1}>{children}</main>
    </Stack.Root>
  );
}
