import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { HOLD_MINUTES, modeledStates } from "./flows/booking/states";

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
    expect(screen.getByRole("heading", { name: "Lantern" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("How long?"), "90");
    await user.click(screen.getByRole("button", { name: "Book room" }));
    expect(screen.getByText("Lantern is yours for 1 hour 30 minutes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book room" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Hold room" })).toBeDisabled();
  });

  it("holds a room instead of booking it", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?state=choosing&page=booking");
    render(<App />);
    await user.selectOptions(screen.getByLabelText("How long?"), "90");
    await user.click(screen.getByRole("button", { name: "Hold room" }));
    expect(screen.getByText("Room held")).toBeInTheDocument();
    expect(screen.getByLabelText("How long?")).toHaveValue("90");
  });

  it("books a held room for the length chosen before the hold", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?state=choosing&page=booking");
    render(<App />);
    await user.selectOptions(screen.getByLabelText("How long?"), "30");
    await user.click(screen.getByRole("button", { name: "Hold room" }));
    expect(screen.getByRole("button", { name: "Hold room" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Book room" }));
    expect(screen.getByText("Room booked")).toBeInTheDocument();
    expect(screen.getByText("Harbor is yours for 30 minutes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book room" })).toBeDisabled();
  });

  it("ends a hold after its minutes run out and still books the room", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    window.history.replaceState(null, "", "/?state=choosing&page=booking");
    render(<App />);
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
    expect(screen.getByRole("button", { name: "Hold room" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "All rooms" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Book room" }));
    expect(screen.getByText("Harbor is yours for 30 minutes.")).toBeInTheDocument();
  });

  it("goes back to the list after a hold ends", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?state=expired");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "All rooms" }));
    expect(screen.getByRole("heading", { name: "Book a room" })).toBeInTheDocument();
  });

  it("goes back from a room to the list", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?state=choosing&page=booking");
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

  it.each(modeledStates)("previews the %s state on one page", (state) => {
    window.history.replaceState(null, "", `/?state=${state}`);
    const { container } = render(<App />);
    const pages = container.querySelectorAll("[data-page]");
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveAttribute("data-state", state);
  });
});
