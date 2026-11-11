import { describe, expect, it } from "vitest";
import { eventEdges, measureRoutes, shortestPath } from "./shortest-path";

type Room =
  | { readonly page: "rooms" }
  | { readonly page: "booking"; readonly details: boolean; readonly duration: number }
  | { readonly page: "held"; readonly confirmed: boolean }
  | { readonly page: "booked" };

type RoomEvent = { readonly type: "choose" | "details" | "longer" | "hold" | "confirm" | "book" | "back" };

const events: readonly RoomEvent[] = ["choose", "details", "longer", "hold", "confirm", "book", "back"].map((type) => ({ type }) as RoomEvent);

/** A room booking flow. `confirmHeld` makes a held room need a confirm before Book. */
function reducer(confirmHeld: boolean) {
  return (state: Room, event: RoomEvent): Room => {
    if (state.page === "rooms" && event.type === "choose") return { page: "booking", details: false, duration: 60 };
    if (state.page === "booking") {
      if (event.type === "details") return { ...state, details: !state.details };
      if (event.type === "longer") return { ...state, duration: state.duration + 30 };
      if (event.type === "hold") return { page: "held", confirmed: false };
      if (event.type === "book") return { page: "booked" };
      if (event.type === "back") return { page: "rooms" };
    }
    if (state.page === "held") {
      if (event.type === "confirm") return { ...state, confirmed: true };
      if (event.type === "book" && (state.confirmed || !confirmHeld)) return { page: "booked" };
    }
    return state;
  };
}

const booked = (state: Room) => state.page === "booked";
const steps = new Set(["choose", "hold", "book"]);

describe("measureRoutes", () => {
  it("measures a route through another task's step, not only the shortest path", () => {
    const edges = eventEdges(events, reducer(false));
    expect(shortestPath<Room>({ page: "rooms" }, edges, booked)).toEqual(["choose", "book"]);
    expect(measureRoutes<Room>({ page: "rooms" }, edges, booked, steps, 3)).toEqual({ kind: "within", longest: ["choose", "hold", "book"] });
    expect(measureRoutes<Room>({ page: "rooms" }, edges, booked, steps, 2)).toEqual({ kind: "over", route: ["choose", "hold", "book"] });
  });

  it("counts an event that is not a step when the finish needs it", () => {
    const edges = eventEdges(events, reducer(true));
    expect(measureRoutes<Room>({ page: "rooms" }, edges, booked, steps, 3)).toEqual({ kind: "over", route: ["choose", "hold", "confirm", "book"] });
  });

  it("does not count optional events no task names, however many states they reach", () => {
    // longer has no cap, so the reducer's state space is unbounded.
    const edges = eventEdges(events, reducer(false));
    expect(measureRoutes<Room>({ page: "rooms" }, edges, booked, new Set(["choose", "book"]), 2)).toEqual({ kind: "within", longest: ["choose", "book"] });
  });

  it("never returns to a state it has passed, so a cycle of steps ends", () => {
    const edges = eventEdges(events, reducer(false));
    const result = measureRoutes<Room>({ page: "rooms" }, edges, booked, new Set(["choose", "back", "book"]), 2);
    expect(result).toEqual({ kind: "within", longest: ["choose", "book"] });
  });

  it("measures steps that come in any order once per state, not once per order", () => {
    // Eight independent settings, then done: 8! orders, 256 states, the longest route 9 steps.
    const edges = [
      ...Array.from({ length: 8 }, (_, bit) => ({
        step: `set-${bit}`,
        when: (node: number) => node >= 0 && (node & (1 << bit)) === 0,
        apply: (node: number) => node | (1 << bit),
      })),
      { step: "done", when: (node: number) => node >= 0, apply: () => -1 },
    ];
    const result = measureRoutes(0, edges, (node) => node === -1, new Set(edges.map((edge) => edge.step)), 9);
    expect(result).toEqual({ kind: "within", longest: [...Array.from({ length: 8 }, (_, bit) => `set-${bit}`), "done"] });
    expect(measureRoutes(0, edges, (node) => node === -1, new Set(edges.map((edge) => edge.step)), 8).kind).toBe("over");
  });

  it("gives up past its route limit instead of searching forever", () => {
    // Six steps from every state, each to a new state, and done finishes from any of them.
    const edges = [
      ...Array.from({ length: 6 }, (_, index) => ({
        step: `step-${index}`,
        when: (node: number) => node >= 0,
        apply: (node: number) => node * 7 + index + 1,
      })),
      { step: "done", when: () => true, apply: () => -1 },
    ];
    const result = measureRoutes(0, edges, (node) => node === -1, new Set(edges.map((edge) => edge.step)), 20, 10);
    expect(result).toEqual({ kind: "too-many", limit: 10 });
  });
});
