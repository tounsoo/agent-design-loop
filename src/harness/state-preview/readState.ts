import { isModeledState, type ModeledState } from "../../flows/notification-prefs/states";

/** `?state=` preview. Unknown values fall through to the interactive ready flow. */
export function readPreviewState(search: string): ModeledState | null {
  const value = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("state");
  if (value == null || !isModeledState(value)) return null;
  return value;
}
