import { Button, Card, Stack, Text } from "../../catalog";
import type { Room } from "../../flows/booking/states";

/** The rooms page's ready body: one card per free room, each with its own Choose action. Not a table. */
export function RoomCards({ rooms, onChoose }: { rooms: readonly Room[]; onChoose: (roomId: string) => void }) {
  return (
    <div className="room-cards">
      {rooms.map((room) => (
        <Card.Root key={room.id}>
          <Card.Header>
            <Text.Root as="h2" weight="bold">
              {room.name}
            </Text.Root>
          </Card.Header>
          <Card.Body>
            <Stack.Root gap="condensed">
              <Text.Root as="p">{room.floor}</Text.Root>
              <Text.Root as="p" tone="muted">
                Seats {room.seats}
              </Text.Root>
            </Stack.Root>
          </Card.Body>
          <Card.Footer>
            <Button.Root aria-label={`Choose ${room.name}`} type="button" variant="secondary" onClick={() => onChoose(room.id)}>
              Choose
            </Button.Root>
          </Card.Footer>
        </Card.Root>
      ))}
    </div>
  );
}
