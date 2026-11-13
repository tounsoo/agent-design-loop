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

  it("titles a vendor's page with its vendor, an added vendor included", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?route=vendors");
    render(<App />);
    await user.click(screen.getByText("Add a vendor"));
    await user.type(screen.getByRole("textbox", { name: "Vendor name" }), "Ridgeway Janitorial");
    await user.type(screen.getByRole("textbox", { name: "Remittance email" }), "ap@ridgeway.example");
    await user.click(screen.getByRole("button", { name: "Add vendor" }));
    await user.click(screen.getByRole("link", { name: "Ridgeway Janitorial" }));
    expect(screen.getByRole("heading", { level: 1, name: "Ridgeway Janitorial" })).toHaveFocus();
    expect(document.title).toMatch(/^Ridgeway Janitorial/);
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Vendors" }));
    await user.click(screen.getByRole("link", { name: "Helios Freight" }));
    expect(document.title).toMatch(/^Helios Freight/);
  });

  it("opens a vendor's page from its card in the Vendor added preview, titled as the page", async () => {
    // Ridgeway Janitorial is the Vendor added preview's vendor. Its card's link leaves the preview and still opens its page.
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?scenario=vendor-added");
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Ridgeway Janitorial" }));
    expect(screen.getByRole("heading", { level: 1, name: "Ridgeway Janitorial" })).toHaveFocus();
    expect(document.title).toMatch(/^Ridgeway Janitorial/);
  });

  it("titles a link to a vendor Meridian does not have as Vendors, the page it opens", () => {
    window.history.replaceState(null, "", "/?route=vendors&vendor=nobody-at-all");
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Vendors" })).toBeInTheDocument();
    expect(document.title).toMatch(/^Vendors/);
  });
});
