/** Illegal: prefs-saved is modeled and has no case. */
export function render(state: string): string | null {
  switch (state) {
    case "loading":
    case "empty":
    case "error":
    case "ready":
      return state;
    default:
      return null;
  }
}
