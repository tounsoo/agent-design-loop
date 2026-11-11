import { useId } from "react";
import { Alert, Button, Disclosure, EmptyState, Field, Label, Loader, Stack, Text } from "../../catalog";
import { RoomCards } from "../../content-layouts/room-cards";
import {
  durationLabel,
  durations,
  isDuration,
  roomById,
  sampleRooms,
  type Duration,
  type FlowState,
  type ModeledState,
  type Room,
} from "../../flows/booking/states";
import { BookingPage } from "../../page-types/booking";
import { RoomsPage } from "../../page-types/rooms";

export type Actions = {
  retry: () => void;
  chooseRoom: (roomId: string) => void;
  back: () => void;
  setDuration: (duration: Duration) => void;
  setDetailsOpen: (open: boolean) => void;
  book: () => void;
  hold: () => void;
};

/** States this module renders. A missing member is a type error. */
export const renderedStates = ["loading", "no-rooms", "error", "choosing", "booked", "held"] as const satisfies readonly ModeledState[];

type MissingView = Exclude<ModeledState, (typeof renderedStates)[number]>;
type ViewsCovered = MissingView extends never ? true : never;
export const viewsCovered: ViewsCovered = true;

type RoomsState = Extract<FlowState, { status: "loading" | "no-rooms" | "error" } | { page: "rooms" }>;
type BookingState = Exclude<FlowState, RoomsState>;

/** One view per modeled state. check:state-coverage reads the cases. */
export function BookingView({ state, actions }: { state: FlowState; actions: Actions }) {
  switch (state.status) {
    case "loading":
    case "no-rooms":
    case "error":
      return <Rooms actions={actions} state={state} />;
    case "choosing":
      return state.page === "rooms" ? <Rooms actions={actions} state={state} /> : <Booking actions={actions} state={state} />;
    case "booked":
    case "held":
      return <Booking actions={actions} state={state} />;
  }
}

function Rooms({ state, actions }: { state: RoomsState; actions: Actions }) {
  return (
    <RoomsPage state={state.status}>
      <RoomsPage.Title>Book a room</RoomsPage.Title>
      <RoomsPage.Intro>Rooms that are free for the next hour and a half.</RoomsPage.Intro>
      <RoomsPage.List>
        {state.status === "loading" ? <Loader.Root aria-label="Loading free rooms" /> : null}
        {state.status === "no-rooms" ? (
          <EmptyState.Root>
            <EmptyState.Title>No rooms are free</EmptyState.Title>
            <EmptyState.Description>Every room is booked for the next hour and a half.</EmptyState.Description>
          </EmptyState.Root>
        ) : null}
        {state.status === "error" ? (
          <Alert.Root role="none" tone="critical">
            <Alert.Title>{state.message}</Alert.Title>
            <Button.Root type="button" variant="secondary" onClick={actions.retry}>
              Try again
            </Button.Root>
          </Alert.Root>
        ) : null}
        {state.status === "choosing" ? <RoomCards rooms={sampleRooms} onChoose={actions.chooseRoom} /> : null}
      </RoomsPage.List>
    </RoomsPage>
  );
}

function DurationField({ duration, disabled, onDuration }: { duration: Duration; disabled: boolean; onDuration: (duration: Duration) => void }) {
  const fieldId = useId();
  return (
    <Stack.Root gap="condensed">
      <Label.Root htmlFor={fieldId}>How long?</Label.Root>
      <Field.Root disabled={disabled} id={fieldId}>
        <Field.Select
          value={duration}
          onValueChange={(value) => {
            if (isDuration(value)) onDuration(value);
          }}
        >
          {durations.map((option) => (
            <option key={option} value={option}>
              {durationLabel[option]}
            </option>
          ))}
        </Field.Select>
      </Field.Root>
    </Stack.Root>
  );
}

function RoomDetails({ room, open, onToggle }: { room: Room; open: boolean; onToggle: (open: boolean) => void }) {
  return (
    <Disclosure.Root
      open={open}
      onToggle={(event) => {
        onToggle(event.currentTarget.open);
      }}
    >
      <Disclosure.Summary>Room details</Disclosure.Summary>
      <Stack.Root gap="condensed">
        {room.equipment.map((item) => (
          <Text.Root as="p" key={item}>
            {item}
          </Text.Root>
        ))}
      </Stack.Root>
    </Disclosure.Root>
  );
}

function Booking({ state, actions }: { state: BookingState; actions: Actions }) {
  const room = roomById(state.roomId) ?? sampleRooms[0];
  if (!room) throw new Error("Nook has no rooms to book.");
  const choosing = state.status === "choosing";
  const duration = state.status === "held" ? "60" : state.duration;
  return (
    <BookingPage state={state.status}>
      <BookingPage.Back>
        <Button.Root type="button" variant="ghost" onClick={actions.back} disabled={!choosing}>
          All rooms
        </Button.Root>
      </BookingPage.Back>
      <BookingPage.Title>{room.name}</BookingPage.Title>
      <BookingPage.Facts>
        {room.floor} · Seats {room.seats}
      </BookingPage.Facts>
      <BookingPage.Body>
        <Stack.Root gap="normal" role="status">
          {state.status === "booked" ? (
            <Alert.Root role="none" tone="success">
              <Alert.Title>Room booked</Alert.Title>
              <Alert.Description>
                {room.name} is yours for {durationLabel[state.duration]}.
              </Alert.Description>
            </Alert.Root>
          ) : null}
          {state.status === "held" ? (
            <Alert.Root role="none" tone="info">
              <Alert.Title>Room held</Alert.Title>
              <Alert.Description>{room.name} is held for you for 15 minutes.</Alert.Description>
            </Alert.Root>
          ) : null}
        </Stack.Root>
        <DurationField disabled={!choosing} duration={duration} onDuration={actions.setDuration} />
        <RoomDetails open={state.status === "choosing" && state.detailsOpen} room={room} onToggle={actions.setDetailsOpen} />
      </BookingPage.Body>
      <BookingPage.Alternate>
        <Button.Root disabled={!choosing} type="button" variant="secondary" onClick={actions.hold}>
          Hold room
        </Button.Root>
      </BookingPage.Alternate>
      <BookingPage.Action>
        <Button.Root disabled={!choosing} type="button" onClick={actions.book}>
          Book room
        </Button.Root>
      </BookingPage.Action>
    </BookingPage>
  );
}
