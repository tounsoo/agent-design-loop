/** The longer-route fixture's modeled states: the two-task inbox's. */
export const modeledStates = ["loading", "ready", "reminded", "archived"] as const;

export type NoteState =
  | { readonly status: "ready"; readonly open: boolean }
  | { readonly status: "reminded" }
  | { readonly status: "archived" };

export type NoteEvent =
  | { readonly type: "open-note" }
  | { readonly type: "send-reminder" }
  | { readonly type: "archive" }
  | { readonly type: "close-note" };

export const flowStart: NoteState = { status: "ready", open: false };

/** close-note is no task's step, so it is a detour, not a route. */
export const userEvents: readonly NoteEvent[] = [{ type: "open-note" }, { type: "send-reminder" }, { type: "archive" }, { type: "close-note" }];

/** Open a note, then remind or archive it. A reminded note can still be archived. */
export function transition(state: NoteState, event: NoteEvent): NoteState {
  if (state.status === "reminded" && event.type === "archive") return { status: "archived" };
  if (state.status !== "ready") return state;
  if (event.type === "open-note") return { ...state, open: true };
  if (event.type === "close-note") return { ...state, open: false };
  if (event.type === "send-reminder" && state.open) return { status: "reminded" };
  if (event.type === "archive" && state.open) return { status: "archived" };
  return state;
}

export function render(state: string): string | null {
  return (modeledStates as readonly string[]).includes(state) ? state : null;
}
