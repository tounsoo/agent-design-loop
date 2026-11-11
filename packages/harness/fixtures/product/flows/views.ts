/** A view for every modeled state. */
export function render(state: string): string | null {
  switch (state) {
    case "loading":
    case "empty":
    case "error":
    case "ready":
    case "invoice-approved":
    case "changes-requested":
      return state;
    default:
      return null;
  }
}
