import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DensityProvider, ThemeProvider } from "../../catalog";
import { readLocation } from "../../harness/state-preview";
import { InvoiceApproval } from "./InvoiceApproval";

function Harness({ search }: { search: string }) {
  const [current, setCurrent] = useState(search);
  const location = readLocation(current);
  return (
    <ThemeProvider appearance="light">
      <DensityProvider density="comfortable">
        <InvoiceApproval
          location={location}
          onNavigate={(href) => {
            const url = new URL(href, "http://meridian.local/");
            setCurrent(url.search);
          }}
        />
      </DensityProvider>
    </ThemeProvider>
  );
}

function renderApproval(search = "") {
  return render(<Harness search={search} />);
}

describe("invoice approval views", () => {
  it("shows the queue without an approve button", () => {
    renderApproval();
    expect(screen.getByRole("heading", { name: "To approve" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Northwind Office Supply/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Helios Freight/ })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Invoice pages" })).toBeInTheDocument();
    expect(document.querySelector("[data-content-layout='data-table']")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("renders loading, empty, and error", () => {
    const { unmount } = renderApproval("?state=loading");
    expect(screen.getAllByText("Loading invoices").length).toBeGreaterThan(0);
    unmount();

    renderApproval("?state=empty");
    expect(screen.getByRole("heading", { name: "No invoices waiting" })).toBeInTheDocument();
    expect(document.querySelector("[data-content-layout='data-table']")).toBeNull();
  });

  it("shows the load error with a secondary retry", () => {
    renderApproval("?state=error");
    expect(screen.getByText("Couldn't load invoices.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("searches the queue and pages the rest", async () => {
    const user = userEvent.setup();
    renderApproval();
    await user.type(screen.getByRole("searchbox", { name: "Search invoices" }), "Helios");
    expect(screen.getByRole("link", { name: /INV-1907/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /INV-1842/ })).toBeNull();
    await user.clear(screen.getByRole("searchbox", { name: "Search invoices" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("link", { name: /INV-1888/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /INV-1842/ })).toBeNull();
  });

  it("lists every status on all invoices and vendors on their own collection", () => {
    const { unmount } = renderApproval("?route=invoices");
    expect(screen.getByRole("heading", { name: "All invoices" })).toBeInTheDocument();
    expect(document.querySelector("[data-content-layout='data-table']")).not.toBeNull();
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Changes requested").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    unmount();

    renderApproval("?route=vendors");
    expect(screen.getByRole("heading", { name: "Vendors" })).toBeInTheDocument();
    expect(document.querySelector("[data-content-layout='data-table']")).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "Vendor pages" })).toBeInTheDocument();
    const kite = screen.getByRole("row", { name: /Kite Analytics/ });
    expect(kite).toHaveTextContent("0");
    expect(kite).toHaveTextContent("INV-1802");
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("approves after opening an invoice and its line items", async () => {
    const user = userEvent.setup();
    renderApproval();
    await user.click(screen.getByRole("link", { name: /Northwind Office Supply/ }));
    expect(screen.getByRole("heading", { name: "Northwind Office Supply" })).toBeInTheDocument();
    expect(document.querySelector("[data-content-layout='data-table']")).toBeNull();
    expect(screen.getByRole("link", { name: "To approve" })).toBeInTheDocument();
    expect(screen.getAllByText("INV-1842").length).toBeGreaterThan(0);
    const primary = document.querySelector("[data-slot='primary']");
    expect(primary?.querySelectorAll("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Request changes" })).toBeEnabled();

    const details = document.querySelector("details");
    expect(details).not.toBeNull();
    if (details) details.open = true;
    details?.dispatchEvent(new Event("toggle", { bubbles: true }));
    expect(await screen.findByText("Printer toner")).toBeInTheDocument();
    expect(screen.getByText("PO-4418")).toBeInTheDocument();
    expect(screen.getByText("Invoice date")).toBeInTheDocument();
    expect(screen.getByText("Nov 4, 2026")).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.getByText("Nov 5, 2026")).toBeInTheDocument();
    expect(screen.getByText("Payment terms")).toBeInTheDocument();
    expect(screen.getByText("Net 14")).toBeInTheDocument();
    expect(screen.getByText("Submitted by")).toBeInTheDocument();
    expect(screen.getByText("Priya Shah")).toBeInTheDocument();
    expect(screen.getByText("Billing entity")).toBeInTheDocument();
    expect(screen.getByText("Meridian Labs, Inc.")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Quantity" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Unit price" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "GL account" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cost center" })).toBeInTheDocument();
    const toner = screen.getByRole("row", { name: /Printer toner/ });
    expect(toner).toHaveTextContent("$215.00");
    expect(toner).toHaveTextContent("$860.00");
    expect(toner).toHaveTextContent("6100 Office supplies");
    expect(toner).toHaveTextContent("140 Facilities");

    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("Invoice approved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });

  it("requires a reason before requesting changes", async () => {
    const user = userEvent.setup();
    renderApproval("?state=ready&page=detail");
    await user.click(screen.getByRole("button", { name: "Request changes" }));
    const reason = screen.getByRole("textbox", { name: "What should change?" });
    await user.click(screen.getByRole("button", { name: "Request changes" }));
    expect(screen.getByText("Enter what the vendor should change.")).toBeInTheDocument();
    await user.type(reason, "Quantity on toner does not match the packing slip.");
    await user.click(screen.getByRole("button", { name: "Request changes" }));
    expect(screen.getByRole("status")).toHaveTextContent("Changes requested");
    expect(screen.getByText("Quantity on toner does not match the packing slip.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });
});
