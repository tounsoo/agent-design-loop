import { describe, expect, it } from "vitest";
import { lineTotal, sampleInvoices, shownActivity, unitPrice, type Invoice } from "./states";

describe("sample ledger", () => {
  it("has lines that add up to each invoice's amount", () => {
    for (const invoice of sampleInvoices) {
      expect(lineTotal(invoice), invoice.number).toBe(invoice.amountCents);
    }
  });

  it("prices each line's units in whole cents", () => {
    for (const invoice of sampleInvoices) {
      for (const line of invoice.lines) {
        expect(line.quantity, `${invoice.number} ${line.description}`).toBeGreaterThan(0);
        expect(Number.isInteger(unitPrice(line)), `${invoice.number} ${line.description}`).toBe(true);
      }
    }
  });

  it("starts every invoice's activity with its receipt, and ends a decided one with its decision", () => {
    for (const invoice of sampleInvoices) {
      expect(invoice.activity[0]?.kind, invoice.number).toBe("received");
      const last = invoice.activity[invoice.activity.length - 1]?.kind;
      expect(last, invoice.number).toBe(invoice.status === "pending" ? "sent" : invoice.status);
    }
  });
});

describe("shown activity", () => {
  const pending = sampleInvoices.find((invoice) => invoice.status === "pending") as Invoice;
  const approved = sampleInvoices.find((invoice) => invoice.status === "approved") as Invoice;

  it("shows a waiting invoice's activity as it is", () => {
    expect(shownActivity(pending, "pending")).toBe(pending.activity);
  });

  it("dates a decision the sample data does not hold yet today", () => {
    expect(shownActivity(pending, "approved").at(-1)).toEqual({ kind: "approved", on: "Today" });
    expect(shownActivity(pending, "changes-requested").at(-1)).toEqual({ kind: "changes-requested", on: "Today" });
  });

  it("does not repeat a decision the sample data already holds", () => {
    expect(shownActivity(approved, "approved")).toBe(approved.activity);
  });
});
