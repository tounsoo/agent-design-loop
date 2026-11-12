import { Button, Stack, Text } from "../../catalog";
import type { Room } from "../../flows/booking/states";

/** What a row offers: join a room's waitlist, leave it, or choose a room that freed up. */
export type RoomRow = { readonly room: Room; readonly offer: "join" | "leave" | "choose" };

const text = { join: "Join waitlist", leave: "Leave waitlist", choose: "Choose" } as const;

/** Each name starts with the visible text, so a voice command that says the text finds the button. */
const label = { join: "Join waitlist for", leave: "Leave waitlist for", choose: "Choose" } as const;

/**
 * The waitlist's ready body: one row per room, its name and facts first and
 * its one action at the row's end, so the actions line up down the list.
 * Not cards: a row's action changes as the person acts on it.
 */
export function RoomRows({
  rows,
  onJoin,
  onLeave,
  onChoose,
}: {
  rows: readonly RoomRow[];
  onJoin: (roomId: string) => void;
  onLeave: (roomId: string) => void;
  onChoose: (roomId: string) => void;
}) {
  const act = { join: onJoin, leave: onLeave, choose: onChoose };
  return (
    <ul className="room-rows">
      {rows.map(({ room, offer }) => (
        <li className="room-row" key={room.id}>
          <Stack.Root className="room-row-facts" gap="none">
            <Text.Root as="h2" weight="bold">
              {room.name}
            </Text.Root>
            <Text.Root as="p" tone="muted">
              {room.floor} · Seats {room.seats}
            </Text.Root>
          </Stack.Root>
          {/* One button per row, so focus stays on it when its offer changes. */}
          <Button.Root aria-label={`${label[offer]} ${room.name}`} type="button" variant="secondary" onClick={() => act[offer](room.id)}>
            {text[offer]}
          </Button.Root>
        </li>
      ))}
    </ul>
  );
}
