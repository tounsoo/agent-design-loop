import { useId } from "react";
import { Alert, Button, Disclosure, EmptyState, Field, Label, Loader, Stack, Text } from "../../catalog";
import { RoomCards } from "../../content-layouts/room-cards";
import { RoomRows, type RoomRow } from "../../content-layouts/room-rows";
import {
  HOLD_MINUTES,
  durationLabel,
  durations,
  fullRooms,
  isDuration,
  roomById,
  sampleRooms,
  type Duration,
  type FlowState,
  type ModeledState,
  type Place,
  type Room,
} from "../../flows/booking/states";
import { TopBar } from "../../layouts/top-bar";
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
  navigate: (place: Place) => void;
  join: (roomId: string) => void;
  leave: (roomId: string) => void;
};

/** States this module renders. A missing member is a type error. */
export const renderedStates = ["loading", "no-rooms", "error", "choosing", "booked", "held", "expired", "waitlist", "waiting", "freed"] as const satisfies readonly ModeledState[];

type MissingView = Exclude<ModeledState, (typeof renderedStates)[number]>;
type ViewsCovered = MissingView extends never ? true : never;
export const viewsCovered: ViewsCovered = true;

type RoomsState = Extract<FlowState, { status: "loading" | "no-rooms" | "error" } | { page: "rooms" }>;
type WaitlistState = Extract<FlowState, { status: "waitlist" | "waiting" | "freed" }>;
type BookingState = Exclude<FlowState, RoomsState | WaitlistState>;

/** The top bar around every state: which place is current, and whether the flow keeps the person where they are. */
export function BookingView({ state, actions }: { state: FlowState; actions: Actions }) {
  const onWaitlist = state.status === "waitlist" || state.status === "waiting" || state.status === "freed";
  const locked = state.status === "loading" || state.status === "error" || state.status === "held" || state.status === "booked";
  return (
    <TopBar current={onWaitlist ? "waitlist" : "rooms"} locked={locked} onNavigate={actions.navigate}>
      <StateView actions={actions} state={state} />
    </TopBar>
  );
}

/** One view per modeled state. check:state-coverage reads the cases. */
function StateView({ state, actions }: { state: FlowState; actions: Actions }) {
  switch (state.status) {
    case "loading":
    case "no-rooms":
    case "error":
      return <Rooms actions={actions} state={state} />;
    case "choosing":
      return state.page === "rooms" ? <Rooms actions={actions} state={state} /> : <Booking actions={actions} state={state} />;
    case "booked":
    case "held":
    case "expired":
      return <Booking actions={actions} state={state} />;
    case "waitlist":
    case "waiting":
    case "freed":
      return <Waitlist actions={actions} state={state} />;
  }
}

/** The names in a list, as a person says them: "Cedar", "Cedar and Birch", "Cedar, Birch and Oak". */
function spoken(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}

function nameOf(roomId: string): string {
  return roomById(roomId)?.name ?? roomId;
}

function Waitlist({ state, actions }: { state: WaitlistState; actions: Actions }) {
  const rows: RoomRow[] = fullRooms.map((room) => ({
    room,
    offer: state.status === "freed" && state.roomId === room.id ? "choose" : state.waitingFor.includes(room.id) ? "leave" : "join",
  }));
  return (
    <RoomsPage state={state.status}>
      <RoomsPage.Title>Waitlist</RoomsPage.Title>
      <RoomsPage.Intro>Rooms booked for the next hour and a half. Join a waitlist and you&apos;ll see here when one frees up.</RoomsPage.Intro>
      <RoomsPage.List>
        <Stack.Root gap="normal" role="status">
          {state.status === "waitlist" && state.left !== null ? (
            <Alert.Root role="none" tone="info">
              <Alert.Title>You left the waitlist for {nameOf(state.left)}.</Alert.Title>
            </Alert.Root>
          ) : null}
          {state.status === "waiting" ? (
            <Alert.Root role="none" tone="info">
              <Alert.Title>You&apos;re on the waitlist for {spoken(state.waitingFor.map(nameOf))}.</Alert.Title>
              <Alert.Description>If a room frees up, it shows here.</Alert.Description>
            </Alert.Root>
          ) : null}
          {state.status === "freed" ? (
            <Alert.Root role="none" tone="success">
              <Alert.Title>{nameOf(state.roomId)} is free now.</Alert.Title>
              <Alert.Description>
                Choose it to book it.
                {state.waitingFor.length > 0 ? ` You're still on the waitlist for ${spoken(state.waitingFor.map(nameOf))}.` : null}
              </Alert.Description>
            </Alert.Root>
          ) : null}
        </Stack.Root>
        <RoomRows rows={rows} onChoose={actions.chooseRoom} onJoin={actions.join} onLeave={actions.leave} />
      </RoomsPage.List>
    </RoomsPage>
  );
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
            <EmptyState.Actions>
              <Button.Root type="button" variant="secondary" onClick={() => actions.navigate("waitlist")}>
                See the waitlist
              </Button.Root>
            </EmptyState.Actions>
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
  const canBook = choosing || state.status === "held" || state.status === "expired";
  return (
    <BookingPage state={state.status}>
      <BookingPage.Back>
        <Button.Root type="button" variant="ghost" onClick={actions.back} disabled={!choosing && state.status !== "expired"}>
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
              <Alert.Description>
                {room.name} is held for you for {HOLD_MINUTES} minutes. Book it to keep it.
              </Alert.Description>
            </Alert.Root>
          ) : null}
          {state.status === "expired" ? (
            <Alert.Root role="none" tone="warning">
              <Alert.Title>Hold ended</Alert.Title>
              <Alert.Description>{room.name} is no longer held for you. Book it now, or pick another room.</Alert.Description>
            </Alert.Root>
          ) : null}
        </Stack.Root>
        <DurationField disabled={!choosing} duration={state.duration} onDuration={actions.setDuration} />
        <RoomDetails open={state.status === "choosing" && state.detailsOpen} room={room} onToggle={actions.setDetailsOpen} />
      </BookingPage.Body>
      <BookingPage.Alternate>
        <Button.Root disabled={!choosing} type="button" variant="secondary" onClick={actions.hold}>
          Hold room
        </Button.Root>
      </BookingPage.Alternate>
      <BookingPage.Action>
        <Button.Root disabled={!canBook} type="button" onClick={actions.book}>
          Book room
        </Button.Root>
      </BookingPage.Action>
    </BookingPage>
  );
}
