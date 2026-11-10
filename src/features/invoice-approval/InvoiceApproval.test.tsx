import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DensityProvider, ThemeProvider } from "../../catalog";
import type { Preview } from "../../flows/invoice-approval";
import { InvoiceApproval } from "./InvoiceApproval";

function renderApproval(preview: Preview = { state: null, page: null, branch: false }) {
  return render(
    <ThemeProvider appearance="light">
      <DensityProvider density="comfortable">
        <InvoiceApproval preview={preview} />
      </DensityProvider>
    </ThemeProvider>,
  );
}

describe("invoice approval views", () => {
  it("shows the queue without an approve button", () => {
    renderApproval();
    expect(screen.getByRole("heading", { name: "Invoices to approve" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Northwind Office Supply" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Helios Freight" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("renders loading, empty, and error", () => {
    const { unmount } = renderApproval({ state: "loading", page: null, branch: false });
    expect(screen.getAllByText("Loading invoices").length).toBeGreaterThan(0);
    unmount();

    renderApproval({ state: "empty", page: null, branch: false });
    expect(screen.getByRole("heading", { name: "No invoices waiting" })).toBeInTheDocument();
  });

  it("shows the load error with a secondary retry", () => {
    renderApproval({ state: "error", page: null, branch: false });
    expect(screen.getByText("Couldn't load invoices.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("approves after opening an invoice and its line items", async () => {
    const user = userEvent.setup();
    renderApproval();
    await user.click(screen.getByRole("link", { name: "Northwind Office Supply" }));
    expect(screen.getByRole("heading", { name: "Northwind Office Supply" })).toBeInTheDocument();
    expect(screen.getByText("INV-1842")).toBeInTheDocument();
    const primary = document.querySelector("[data-slot='primary']");
    expect(primary?.querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Request changes" })).toBeEnabled();

    const details = document.querySelector("details");
    expect(details).not.toBeNull();
    if (details) details.open = true;
    details?.dispatchEvent(new Event("toggle", { bubbles: true }));
    expect(await screen.findByText("Printer toner")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("Invoice approved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });

  it("requires a reason before requesting changes", async () => {
    const user = userEvent.setup();
    renderApproval({ state: "ready", page: "detail", branch: false });
    await user.click(screen.getByRole("button", { name: "Request changes" }));
    const reason = screen.getByRole("textbox", { name: "What should change?" });
    await user.click(screen.getByRole("button", { name: "Request changes" }));
    expect(screen.getByText("Enter what the vendor should change.")).toBeInTheDocument();
    await user.type(reason, "Quantity on toner does not match the packing slip.");
    await user.click(screen.getByRole("button", { name: "Request changes" }));
    expect(screen.getByText("Changes requested")).toBeInTheDocument();
    expect(screen.getByText("Quantity on toner does not match the packing slip.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });
});
