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

    await user.type(screen.getByRole("searchbox", { name: "Search vendors" }), "Northwind");
    await user.click(screen.getByRole("link", { name: "Northwind Office Supply" }));
    expect(screen.getByRole("heading", { name: "Northwind Office Supply" })).toBeInTheDocument();
    expect(document.title).toBe("Northwind Office Supply · Meridian");
    expect(screen.getByRole("link", { name: "Vendors", current: "page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vendors", current: false })).toHaveAttribute("href", "?route=vendors");
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });
});
