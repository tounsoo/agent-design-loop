import { Booking } from "./features/booking/Booking";
import { ThemeProvider } from "./catalog";
import { readPreview } from "./preview";

/** The top bar is part of the booking view, since what it offers follows the flow's state. */
export function App() {
  const search = window.location.search;
  return (
    <ThemeProvider appearance="system">
      <Booking fail={new URLSearchParams(search).has("fail")} initial={readPreview(search)} />
    </ThemeProvider>
  );
}
