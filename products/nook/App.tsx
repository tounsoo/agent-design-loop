import { Booking } from "./features/booking/Booking";
import { ThemeProvider } from "./catalog";
import { TopBar } from "./layouts/top-bar";
import { readPreview } from "./preview";

export function App() {
  const search = window.location.search;
  return (
    <ThemeProvider appearance="system">
      <TopBar>
        <Booking fail={new URLSearchParams(search).has("fail")} initial={readPreview(search)} />
      </TopBar>
    </ThemeProvider>
  );
}
