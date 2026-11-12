import { Alert, Button, Stack } from "@tounsoo/todae";
import { useReducer } from "react";
import { createRoot } from "react-dom/client";

/**
 * Nook's Waitlist page from pull request 42, cut down to its rows and its
 * status region, built with Todae. Before its fix, each offer was its own
 * button, so the row's button was swapped for a new one when the person
 * joined or left and focus fell to the page; and leaving one waitlist while a
 * room was free changed the row and said nothing. The fix kept one button
 * per row and said what changed in the status region.
 */

type Room = { readonly id: string; readonly name: string };
const rooms: readonly Room[] = [
  { id: "cedar", name: "Cedar" },
  { id: "birch", name: "Birch" },
];
const nameOf = (id: string) => rooms.find((room) => room.id === id)?.name ?? id;
const spoken = (names: readonly string[]) => names.join(" and ");

type State = { readonly waitingFor: readonly string[]; readonly freed: string | null; readonly left: string | null };
type Event = { readonly type: "join" | "leave"; readonly roomId: string };

const previews: Record<string, State> = {
  waitlist: { waitingFor: [], freed: null, left: null },
  waiting: { waitingFor: ["cedar"], freed: null, left: null },
  freed: { waitingFor: ["birch"], freed: "cedar", left: null },
};

function transition(state: State, event: Event): State {
  if (event.type === "join") return { ...state, waitingFor: [...state.waitingFor, event.roomId], left: null };
  return { ...state, waitingFor: state.waitingFor.filter((id) => id !== event.roomId), left: event.roomId };
}

/** What changes between the version before the fix and after it. */
export type Version = { readonly oneButtonPerRow: boolean; readonly sayLeavingWhileFree: boolean };

const text = { join: "Join waitlist", leave: "Leave waitlist", choose: "Choose" } as const;
const label = { join: "Join waitlist for", leave: "Leave waitlist for", choose: "Choose" } as const;
type Offer = keyof typeof text;

function Status({ state, version }: { state: State; version: Version }) {
  if (state.freed !== null) {
    const left = state.left !== null && version.sayLeavingWhileFree ? ` You left the waitlist for ${nameOf(state.left)}.` : "";
    return (
      <Alert.Root role="none" tone="success">
        <Alert.Title>{nameOf(state.freed)} is free now.</Alert.Title>
        <Alert.Description>Choose it to book it.{left}</Alert.Description>
      </Alert.Root>
    );
  }
  if (state.waitingFor.length > 0) {
    return (
      <Alert.Root role="none" tone="info">
        <Alert.Title>You&apos;re on the waitlist for {spoken(state.waitingFor.map(nameOf))}.</Alert.Title>
        <Alert.Description>If a room frees up, it shows here.</Alert.Description>
      </Alert.Root>
    );
  }
  return state.left !== null ? (
    <Alert.Root role="none" tone="info">
      <Alert.Title>You left the waitlist for {nameOf(state.left)}.</Alert.Title>
    </Alert.Root>
  ) : null;
}

function Row({ room, offer, version, act }: { room: Room; offer: Offer; version: Version; act: (offer: Offer) => void }) {
  if (version.oneButtonPerRow) {
    return (
      <Button.Root aria-label={`${label[offer]} ${room.name}`} type="button" variant="secondary" onClick={() => act(offer)}>
        {text[offer]}
      </Button.Root>
    );
  }
  // Before the fix: one button per offer, so a new offer is a new button.
  return (
    <>
      {offer === "join" ? (
        <Button.Root aria-label={`Join waitlist for ${room.name}`} type="button" variant="secondary" onClick={() => act("join")}>
          Join waitlist
        </Button.Root>
      ) : null}
      {offer === "leave" ? (
        <Button.Root aria-label={`Leave waitlist for ${room.name}`} type="button" variant="secondary" onClick={() => act("leave")}>
          Leave waitlist
        </Button.Root>
      ) : null}
      {offer === "choose" ? (
        <Button.Root aria-label={`Choose ${room.name}`} type="button" variant="secondary" onClick={() => act("choose")}>
          Choose
        </Button.Root>
      ) : null}
    </>
  );
}

function Waitlist({ initial, version }: { initial: State; version: Version }) {
  const [state, dispatch] = useReducer(transition, initial);
  return (
    <main>
      <h1>Waitlist</h1>
      <Stack.Root gap="normal" role="status">
        <Status state={state} version={version} />
      </Stack.Root>
      <ul>
        {rooms.map((room) => {
          const offer: Offer = state.freed === room.id ? "choose" : state.waitingFor.includes(room.id) ? "leave" : "join";
          return (
            <li key={room.id}>
              <h2>{room.name}</h2>
              {/* Choose opens the booking page in Nook. This page stops at the waitlist, so Choose does nothing here. */}
              <Row act={(chosen) => (chosen === "choose" ? undefined : dispatch({ type: chosen, roomId: room.id }))} offer={offer} room={room} version={version} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export function render(version: Version) {
  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root");
  const preview = new URLSearchParams(window.location.search).get("state") ?? "waitlist";
  createRoot(root).render(<Waitlist initial={previews[preview] ?? previews.waitlist!} version={version} />);
}
