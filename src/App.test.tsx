import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("Meridian shell", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("navigates between the payables collections", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("Meridian")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to content" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "To approve" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "To approve" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "All invoices" }));
    expect(screen.getByRole("heading", { name: "All invoices" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All invoices" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("link", { name: "Vendors" }));
    expect(screen.getByRole("heading", { name: "Vendors" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vendors" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("link", { name: "Tracking" }));
    expect(screen.getByRole("heading", { name: "Tracking" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tracking" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Pending" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });
});
