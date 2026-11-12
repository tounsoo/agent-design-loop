import { Button, Stack, Text } from "../../catalog";
import type { Room } from "../../flows/booking/states";

/** What a row offers: join a room's waitlist, leave it, or choose a room that freed up. */
export type RoomRow = { readonly room: Room; readonly offer: "join" | "leave" | "choose" };

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
          {offer === "join" ? (
            <Button.Root aria-label={`Join the waitlist for ${room.name}`} type="button" variant="secondary" onClick={() => onJoin(room.id)}>
              Join waitlist
            </Button.Root>
          ) : null}
          {offer === "leave" ? (
            <Button.Root aria-label={`Leave the waitlist for ${room.name}`} type="button" variant="secondary" onClick={() => onLeave(room.id)}>
              Leave waitlist
            </Button.Root>
          ) : null}
          {offer === "choose" ? (
            <Button.Root aria-label={`Choose ${room.name}`} type="button" variant="secondary" onClick={() => onChoose(room.id)}>
              Choose
            </Button.Root>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
