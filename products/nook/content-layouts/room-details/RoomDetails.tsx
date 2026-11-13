import { Disclosure, Stack, Text } from "../../catalog";

export type RoomDetailsProps = {
  /** What the room has, one line each. */
  readonly items: readonly string[];
  readonly open: boolean;
  readonly onToggle: (open: boolean) => void;
};

/**
 * Room details content layout: what a room has, closed behind a disclosure.
 * Its summary is "Room details", the section disclosed_sections names, so
 * check:priority finds it here.
 */
export function RoomDetails({ items, open, onToggle }: RoomDetailsProps) {
  return (
    <Disclosure.Root
      open={open}
      onToggle={(event) => {
        onToggle(event.currentTarget.open);
      }}
    >
      <Disclosure.Summary>Room details</Disclosure.Summary>
      <Stack.Root gap="condensed">
        {items.map((item) => (
          <Text.Root as="p" key={item}>
            {item}
          </Text.Root>
        ))}
      </Stack.Root>
    </Disclosure.Root>
  );
}
