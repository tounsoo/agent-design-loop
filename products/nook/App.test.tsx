import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { scenarios } from "./flows/booking/scenarios";
import { FREE_UP_SECONDS, HOLD_MINUTES } from "./flows/booking/states";
import { transition } from "./flows/booking/transition";

describe("Nook", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the free rooms, books one, and locks the page", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Book a room" })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Choose Lantern" }));
    expect(screen.getByRole("heading", { name: "Lantern" })).toHaveFocus();
    await user.selectOptions(screen.getByLabelText("How long?"), "90");
    await user.click(screen.getByRole("button", { name: "Book room" }));
    expect(screen.getByText("Lantern is yours for 1 hour 30 minutes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book room" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Hold room" })).toHaveAttribute("aria-disabled", "true");
    // A submit keeps focus, and the status says what happened.
    expect(screen.getByRole("button", { name: "Book room" })).toHaveFocus();
  });

  it("moves focus to the new page's title on every page change, and not on the first page", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Choose Harbor" });
    expect(screen.getByRole("heading", { name: "Book a room" })).not.toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Waitlist" }));
    expect(screen.getByRole("heading", { name: "Waitlist" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Rooms" }));
    expect(screen.getByRole("heading", { name: "Book a room" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Choose Quarry" }));
    expect(screen.getByRole("heading", { name: "Quarry" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Hold room" }));
    // Holding stays on the same page, so focus stays on the button.
    expect(screen.getByRole("button", { name: "Hold room" })).toHaveFocus();
  });

  it("holds a room instead of booking it", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?scenario=booking-harbor");
    render(<App />);
    await user.selectOptions(screen.getByLabelText("How long?"), "90");
    await user.click(screen.getByRole("button", { name: "Hold room" }));
    expect(screen.getByText("Room held")).toBeInTheDocument();
    expect(screen.getByLabelText("How long?")).toHaveValue("90");
  });

  it("books a held room for the length chosen before the hold", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?scenario=booking-harbor");
    render(<App />);
    await user.selectOptions(screen.getByLabelText("How long?"), "30");
    await user.click(screen.getByRole("button", { name: "Hold room" }));
    expect(screen.getByRole("button", { name: "Hold room" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "Book room" }));
    expect(screen.getByText("Room booked")).toBeInTheDocument();
    expect(screen.getByText("Harbor is yours for 30 minutes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book room" })).toHaveAttribute("aria-disabled", "true");
  });

  it("ends a hold after its minutes run out and still books the room", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Choose Harbor" }));
    await user.selectOptions(screen.getByLabelText("How long?"), "30");
    await user.click(screen.getByRole("button", { name: "Hold room" }));
    act(() => {
      vi.advanceTimersByTime(HOLD_MINUTES * 60_000 - 1_000);
    });
    expect(screen.getByText("Room held")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("Hold ended")).toBeInTheDocument();
    expect(screen.queryByText("Room held")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hold room" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "All rooms" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Book room" }));
    expect(screen.getByText("Harbor is yours for 30 minutes.")).toBeInTheDocument();
  });

  it("keeps a held preview held", () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/?scenario=held");
    render(<App />);
    act(() => {
      vi.advanceTimersByTime(HOLD_MINUTES * 60_000);
    });
    expect(screen.getByText("Room held")).toBeInTheDocument();
  });

  it("ends a hold made after opening a preview", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    window.history.replaceState(null, "", "/?scenario=booking-harbor");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Hold room" }));
    act(() => {
      vi.advanceTimersByTime(HOLD_MINUTES * 60_000);
    });
    expect(screen.getByText("Hold ended")).toBeInTheDocument();
  });

  it("goes back to the list after a hold ends", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?scenario=expired");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "All rooms" }));
    expect(screen.getByRole("heading", { name: "Book a room" })).toBeInTheDocument();
  });

  it("goes back from a room to the list", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?scenario=booking-harbor");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "All rooms" }));
    expect(screen.getByRole("heading", { name: "Book a room" })).toBeInTheDocument();
  });

  it("retries after a failed load", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?fail");
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    expect(screen.getByLabelText("Loading free rooms")).toBeInTheDocument();
  });

  it("joins and leaves a waitlist, and says which rooms the person waits for", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Choose Harbor" });
    await user.click(screen.getByRole("button", { name: "Waitlist" }));
    expect(screen.getByRole("heading", { name: "Waitlist" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Waitlist" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Join waitlist for Cedar" }));
    expect(screen.getByRole("button", { name: "Leave waitlist for Cedar" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Join waitlist for Birch" }));
    expect(screen.getByRole("status")).toHaveTextContent("You're on the waitlist for Cedar and Birch.");
    await user.click(screen.getByRole("button", { name: "Leave waitlist for Cedar" }));
    expect(screen.getByRole("status")).toHaveTextContent("You're on the waitlist for Birch.");
    await user.click(screen.getByRole("button", { name: "Leave waitlist for Birch" }));
    expect(screen.getByRole("status")).toHaveTextContent("You left the waitlist for Birch.");
    expect(screen.getByRole("button", { name: "Join waitlist for Birch" })).toBeInTheDocument();
  });

  it("keeps the person's place on the waitlist when they go back to the rooms", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?scenario=waiting");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Rooms" }));
    expect(screen.getByRole("heading", { name: "Book a room" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose Lantern" }));
    await user.click(screen.getByRole("button", { name: "Waitlist" }));
    expect(screen.getByRole("button", { name: "Leave waitlist for Cedar" })).toBeInTheDocument();
  });

  it("frees a room the person waits for, and books it from the waitlist", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    window.history.replaceState(null, "", "/?scenario=waitlist");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Join waitlist for Cedar" }));
    act(() => {
      vi.advanceTimersByTime(FREE_UP_SECONDS * 1000 - 1_000);
    });
    expect(screen.getByRole("button", { name: "Leave waitlist for Cedar" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Cedar is free now.Choose it to book it.");
    await user.click(screen.getByRole("button", { name: "Choose Cedar" }));
    expect(screen.getByRole("heading", { name: "Cedar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Book room" }));
    expect(screen.getByText("Cedar is yours for 1 hour.")).toBeInTheDocument();
  });

  it("says so when the person leaves a waitlist while a room is free", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?scenario=freed");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Leave waitlist for Birch" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cedar is free now.Choose it to book it. You left the waitlist for Birch.");
    expect(screen.getByRole("button", { name: "Join waitlist for Birch" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Join waitlist for Birch" }));
    expect(screen.getByRole("status")).toHaveTextContent("Cedar is free now.Choose it to book it. You're still on the waitlist for Birch.");
  });

  it("keeps a waiting preview waiting", () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/?scenario=waiting");
    render(<App />);
    act(() => {
      vi.advanceTimersByTime(FREE_UP_SECONDS * 1000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("You're on the waitlist for Cedar.");
  });

  it("turns the top bar off where the flow keeps the person on the page", () => {
    window.history.replaceState(null, "", "/?scenario=held");
    render(<App />);
    expect(screen.getByRole("button", { name: "Rooms" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Waitlist" })).toBeDisabled();
  });

  it("opens the waitlist from No rooms are free", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?scenario=no-rooms");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "See the waitlist" }));
    expect(screen.getByRole("heading", { name: "Waitlist" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Rooms" }));
    expect(screen.getByRole("heading", { name: "No rooms are free" })).toBeInTheDocument();
  });

  it("goes back from the waitlist to No rooms are free when it opened from there", () => {
    const opened = transition({ status: "no-rooms", waitingFor: [] }, { type: "open-waitlist" });
    expect(opened).toEqual({ status: "waitlist", roomsFree: false, left: null, waitingFor: [] });
    expect(transition(opened, { type: "open-rooms" })).toEqual({ status: "no-rooms", waitingFor: [] });
  });

  it("only frees a room on the waitlist page, and only one the person waits for", () => {
    const rooms = { status: "choosing", page: "rooms", waitingFor: ["cedar"] } as const;
    expect(transition(rooms, { type: "room-freed", roomId: "cedar" })).toBe(rooms);
    const waiting = { status: "waiting", roomsFree: true, waitingFor: ["cedar"] } as const;
    expect(transition(waiting, { type: "room-freed", roomId: "birch" })).toBe(waiting);
    expect(transition(waiting, { type: "room-freed", roomId: "cedar" })).toEqual({ status: "freed", roomsFree: true, roomId: "cedar", left: null, waitingFor: [] });
  });

  it("does not join a free room's waitlist or choose a full room from the room list", () => {
    const waitlist = { status: "waitlist", roomsFree: true, left: null, waitingFor: [] } as const;
    expect(transition(waitlist, { type: "join-waitlist", roomId: "harbor" })).toBe(waitlist);
    const rooms = { status: "choosing", page: "rooms", waitingFor: [] } as const;
    expect(transition(rooms, { type: "choose-room", roomId: "cedar" })).toBe(rooms);
  });

  it.each(Object.entries(scenarios).map(([id, scenario]) => [id, scenario.state] as const))("renders scenario %s, the %s state, on one page", (id, state) => {
    window.history.replaceState(null, "", `/?scenario=${id}`);
    const { container } = render(<App />);
    const pages = container.querySelectorAll("[data-page]");
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveAttribute("data-state", state);
  });
});
