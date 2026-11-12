import { render, screen, within } from "@testing-library/react";
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
  });

  it("moves focus to the new page's heading on every page change, and not on the first page", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { name: "To approve" })).not.toHaveFocus();
    await user.click(screen.getByRole("link", { name: "All invoices" }));
    expect(screen.getByRole("heading", { level: 1, name: "All invoices" })).toHaveFocus();
    await user.click(screen.getByRole("link", { name: /^INV-1694/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Helios Freight" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Approve" }));
    // Approving stays on the same page: the button keeps focus, turned off, and the status says it.
    expect(screen.getByRole("button", { name: "Approve" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Approve" })).toHaveAttribute("aria-disabled", "true");
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "All invoices" }));
    expect(screen.getByRole("heading", { level: 1, name: "All invoices" })).toHaveFocus();
  });
});
