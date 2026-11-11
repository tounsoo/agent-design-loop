/**
 * The fixture product's modeled states. Its config gives "reminded" a preview
 * query and leaves "archived" out, so target size must still open archived.
 */
export const modeledStates = ["loading", "ready", "reminded", "archived"] as const;

export type NoteState =
  | { readonly status: "ready"; readonly open: boolean }
  | { readonly status: "reminded" }
  | { readonly status: "archived" };

export type NoteEvent = { readonly type: "open-note" } | { readonly type: "send-reminder" } | { readonly type: "archive" };

export const flowStart: NoteState = { status: "ready", open: false };

export const userEvents: readonly NoteEvent[] = [{ type: "open-note" }, { type: "send-reminder" }, { type: "archive" }];

/** The shipped reducer both task graphs measure: open a note, then remind or archive it. */
export function transition(state: NoteState, event: NoteEvent): NoteState {
  if (state.status !== "ready") return state;
  if (event.type === "open-note") return { ...state, open: true };
  if (event.type === "send-reminder" && state.open) return { status: "reminded" };
  if (event.type === "archive" && state.open) return { status: "archived" };
  return state;
}
