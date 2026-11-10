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
    const kiteLink = screen.getByRole("link", { name: "Kite Analytics" });
    expect(kiteLink).toHaveAttribute("href", "?route=vendors&vendor=kite-analytics");
    expect(kiteLink.closest("tr")?.getAttribute("onclick")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("opens a vendor master record without an approval action", async () => {
    const user = userEvent.setup();
    renderApproval("?route=vendors");
    await user.type(screen.getByRole("searchbox", { name: "Search vendors" }), "Northwind");
    await user.click(screen.getByRole("link", { name: "Northwind Office Supply" }));
    expect(screen.getByRole("heading", { name: "Northwind Office Supply" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vendors" })).toHaveAttribute("href", "?route=vendors");
    expect(screen.getByText("36-4829107")).toBeInTheDocument();
    expect(screen.getByText("Net 30")).toBeInTheDocument();
    expect(screen.getByText("ACH")).toBeInTheDocument();
    expect(screen.getByText("400 N Michigan Ave, Chicago, IL 60611")).toBeInTheDocument();
    expect(screen.getByText("Outstanding balance").closest("div")).toHaveTextContent("$4,280.00");
    expect(screen.getByText("Accounts payable · ap@northwind.example")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /INV-/ }).map((link) => link.textContent)).toEqual(["INV-1711", "INV-1842"]);
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Request changes" })).toBeNull();
    expect(document.querySelector("details")).toBeNull();
    expect(document.querySelector("[data-page='detail']")).not.toBeNull();
    expect(document.querySelector("[data-slot='primary']")).toBeNull();

    await user.click(screen.getByRole("link", { name: "Vendors" }));
    expect(screen.getByRole("heading", { name: "Vendors" })).toBeInTheDocument();
  });

  it("opens the invoice from the vendor record on the existing detail", async () => {
    const user = userEvent.setup();
    renderApproval("?route=vendors&vendor=northwind-office-supply");
    await user.click(screen.getByRole("link", { name: "INV-1842" }));
    expect(screen.getByRole("heading", { name: "Northwind Office Supply" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Northwind Office Supply" })).toHaveAttribute(
      "href",
      "?route=vendors&vendor=northwind-office-supply",
    );
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Request changes" })).toBeEnabled();
    expect(document.querySelector("[data-slot='primary'] button")).toHaveTextContent("Approve");

    await user.click(screen.getByRole("link", { name: "Northwind Office Supply" }));
    expect(screen.getByRole("heading", { name: "Northwind Office Supply" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.getByText("Outstanding balance").closest("div")).toHaveTextContent("$4,280.00");
  });

  it("shows a zero outstanding balance when every invoice is approved", () => {
    renderApproval("?route=vendors&vendor=kite-analytics");
    expect(screen.getByRole("heading", { name: "Kite Analytics" })).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "INV-1802" })).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
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
