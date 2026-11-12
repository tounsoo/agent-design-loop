import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DensityProvider, ThemeProvider } from "../../catalog";
import { readLocation } from "../../preview";
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

function vendorCard(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { level: 2, name });
  const card = heading.closest("[role='listitem']");
  if (!(card instanceof HTMLElement)) throw new Error(`${name} has no card`);
  return card;
}

function stageStatuses(): (string | null)[] {
  const progress = screen.getByRole("list", { name: "Invoice progress" });
  return within(progress)
    .getAllByRole("listitem")
    .map((item) => item.getAttribute("data-status"));
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
    expect(screen.getByRole("heading", { level: 1, name: "Vendors" })).toBeInTheDocument();
    expect(document.querySelector("[data-content-layout='directory']")).not.toBeNull();
    expect(document.querySelector("[data-content-layout='data-table']")).toBeNull();
    expect(screen.getByText("8 vendors")).toBeInTheDocument();
    const kite = vendorCard("Kite Analytics");
    expect(kite).toHaveTextContent("Open invoices0");
    expect(kite).toHaveTextContent("INV-1802 · Nov 12, 2026");
    expect(kite).toHaveTextContent("finance@kiteanalytics.example");
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

  it("totals the line items under the table", () => {
    renderApproval("?state=ready&page=detail");
    const total = screen.getByRole("rowheader", { name: "Total" }).closest("tr");
    expect(total?.parentElement?.tagName).toBe("TFOOT");
    expect(total).toHaveTextContent("$4,280.00");
  });

  it("approves in two steps, with Line items left closed", async () => {
    const user = userEvent.setup();
    renderApproval();
    await user.click(screen.getByRole("link", { name: /Northwind Office Supply/ }));
    expect(document.querySelector("details")?.open).toBe(false);
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("Invoice approved")).toBeInTheDocument();
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
  it("shows where the invoice is on its way to payment, before and after Approve", async () => {
    const user = userEvent.setup();
    renderApproval();
    await user.click(screen.getByRole("link", { name: /Northwind Office Supply/ }));
    const progress = screen.getByRole("list", { name: "Invoice progress" });
    expect(within(progress).getByText("Payment due Nov 18, 2026")).toBeInTheDocument();
    expect(stageStatuses()).toEqual(["done", "current", "pending"]);
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(stageStatuses()).toEqual(["done", "done", "current"]);
    expect(within(progress).getAllByRole("listitem")[2]).toHaveTextContent("Next: Payment due Nov 18, 2026");
  });

  it("marks the approval stage when changes are requested", async () => {
    const user = userEvent.setup();
    renderApproval("?state=ready&page=detail");
    await user.click(screen.getByRole("button", { name: "Request changes" }));
    await user.type(screen.getByRole("textbox", { name: "What should change?" }), "Seat count is off.");
    await user.click(screen.getByRole("button", { name: "Request changes" }));
    expect(stageStatuses()).toEqual(["done", "error", "pending"]);
    const progress = screen.getByRole("list", { name: "Invoice progress" });
    expect(within(progress).getAllByRole("listitem")[1]).toHaveTextContent("Changes requested: Approval");
  });

  it("adds a vendor after refusing an empty form, a bad email and a name already listed", async () => {
    const user = userEvent.setup();
    renderApproval("?route=vendors");
    await user.click(screen.getByText("Add a vendor"));
    const name = screen.getByRole("textbox", { name: "Vendor name" });
    const email = screen.getByRole("textbox", { name: "Remittance email" });
    expect(screen.getByRole("combobox", { name: "Payment terms" })).toHaveValue("net-30");

    await user.click(screen.getByRole("button", { name: "Add vendor" }));
    expect(screen.getAllByText("Enter the vendor's name.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enter the email that gets remittance advice.").length).toBeGreaterThan(0);
    expect(name).toHaveAttribute("aria-invalid", "true");

    await user.type(name, "Ridgeway Janitorial");
    await user.type(email, "ap@ridgeway");
    await user.click(screen.getByRole("button", { name: "Add vendor" }));
    expect(screen.getAllByText("Enter an email like ap@vendor.com.").length).toBeGreaterThan(0);
    expect(screen.queryByText("Enter the vendor's name.")).toBeNull();

    await user.clear(name);
    await user.type(name, "  northwind office SUPPLY");
    await user.type(email, ".example");
    await user.click(screen.getByRole("button", { name: "Add vendor" }));
    expect(screen.getAllByText("Northwind Office Supply is already a vendor.").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { level: 2, name: "Ridgeway Janitorial" })).toBeNull();

    await user.clear(name);
    await user.type(name, "Ridgeway Janitorial");
    await user.selectOptions(screen.getByRole("combobox", { name: "Payment terms" }), "net-15");
    await user.click(screen.getByRole("button", { name: "Add vendor" }));

    expect(screen.getByRole("status")).toHaveTextContent("Added Ridgeway Janitorial.");
    const card = vendorCard("Ridgeway Janitorial");
    expect(card).toHaveTextContent("ap@ridgeway.example");
    expect(card).toHaveTextContent("Net 15");
    expect(card).toHaveTextContent("No invoices yet");
    expect(screen.getByText("9 vendors")).toBeInTheDocument();
    const cleared = screen.getByRole("textbox", { name: "Vendor name" });
    expect(cleared).toHaveValue("");
    expect(cleared).toHaveFocus();
    expect(screen.queryByText("Enter the vendor's name.")).toBeNull();
  });

  it("offers to add a vendor the search does not find", async () => {
    const user = userEvent.setup();
    renderApproval("?route=vendors");
    await user.type(screen.getByRole("searchbox", { name: "Search vendors" }), "Ridgeway");
    expect(screen.getByRole("heading", { name: "No vendors found" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add “Ridgeway”" }));
    expect(screen.getByRole("textbox", { name: "Vendor name" })).toHaveValue("Ridgeway");
    expect(screen.getByRole("textbox", { name: "Remittance email" })).toHaveFocus();
  });

  it("clears the search after an add, so the new vendor's card shows", async () => {
    const user = userEvent.setup();
    renderApproval("?route=vendors");
    const search = screen.getByRole("searchbox", { name: "Search vendors" });
    await user.type(search, "Ridge");
    await user.click(screen.getByRole("button", { name: "Add “Ridge”" }));
    const name = screen.getByRole("textbox", { name: "Vendor name" });
    await user.clear(name);
    await user.type(name, "Quarry Stone Works");
    await user.type(screen.getByRole("textbox", { name: "Remittance email" }), "ap@quarrystone.example");
    await user.click(screen.getByRole("button", { name: "Add vendor" }));
    expect(screen.getByRole("status")).toHaveTextContent("Added Quarry Stone Works.");
    expect(search).toHaveValue("");
    expect(vendorCard("Quarry Stone Works")).toHaveTextContent("No invoices yet");
    expect(screen.getByText("9 vendors")).toBeInTheDocument();
  });

  it("previews a vendor just added, on Vendors", () => {
    renderApproval("?state=vendor-added");
    expect(screen.getByRole("heading", { level: 1, name: "Vendors" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Added Ridgeway Janitorial.");
    expect(vendorCard("Ridgeway Janitorial")).toHaveTextContent("No invoices yet");
    expect(document.querySelector("details")?.open).toBe(true);
  });

  it("opens the form on an empty vendor list", () => {
    renderApproval("?state=empty&route=vendors");
    expect(screen.getByRole("heading", { name: "No vendors yet" })).toBeInTheDocument();
    expect(document.querySelector("details")?.open).toBe(true);
    expect(screen.getByText("0 vendors")).toBeInTheDocument();
  });

  it("adds the first vendor from an empty vendor list", async () => {
    const user = userEvent.setup();
    renderApproval("?state=empty&route=vendors");
    // A sample invoice names this vendor, but on Empty nothing has loaded.
    await user.type(screen.getByRole("textbox", { name: "Vendor name" }), "Northwind Office Supply");
    await user.type(screen.getByRole("textbox", { name: "Remittance email" }), "ap@northwind.example");
    await user.click(screen.getByRole("button", { name: "Add vendor" }));
    expect(screen.getByRole("status")).toHaveTextContent("Added Northwind Office Supply.");
    expect(vendorCard("Northwind Office Supply")).toHaveTextContent("No invoices yet");
    expect(screen.getByText("1 vendor")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No vendors yet" })).toBeNull();
  });

  it("names vendors in the Vendors load error", () => {
    renderApproval("?state=error&route=vendors");
    expect(screen.getByText("Couldn't load vendors.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
