import { describe, expect, it } from "vitest";
import {
  AS_OF,
  balanceBucket,
  dueBucket,
  formatDue,
  formatMoney,
  sampleInvoices,
  summarizeVendors,
} from "./states";

const MS_DAY = 86_400_000;

function parseIsoDate(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Bad date ${iso}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const termDays = {
  "Due on receipt": 0,
  "Net 15": 15,
  "Net 30": 30,
  "Net 45": 45,
} as const;

describe("sample payables ledger", () => {
  it("keeps terms, dates, and line totals consistent", () => {
    expect(AS_OF).toBe("2026-11-10");
    for (const invoice of sampleInvoices) {
      const lines = invoice.lines.reduce((sum, line) => sum + line.amountCents, 0);
      expect(lines, invoice.number).toBe(invoice.amountCents);
      expect(invoice.due, invoice.number).toBe(formatDue(invoice.dueOn));
      const due = parseIsoDate(invoice.issuedOn) + termDays[invoice.terms] * MS_DAY;
      expect(invoice.dueOn, invoice.number).toBe(new Date(due).toISOString().slice(0, 10));
      if (invoice.status === "changes-requested") expect(invoice.changeReason?.trim().length).toBeGreaterThan(0);
    }
  });

  it("makes vendor balances match the open invoices", () => {
    const summaries = summarizeVendors(sampleInvoices);
    expect(summaries.length).toBeGreaterThan(10);
    for (const vendor of summaries) {
      const rows = sampleInvoices.filter((invoice) => invoice.vendor === vendor.name);
      const pending = rows.filter((invoice) => invoice.status === "pending");
      expect(new Set(rows.map((invoice) => invoice.terms)).size, vendor.name).toBe(1);
      expect(vendor.openCount, vendor.name).toBe(pending.length);
      expect(vendor.outstandingCents, vendor.name).toBe(pending.reduce((sum, invoice) => sum + invoice.amountCents, 0));
      const latest = [...rows].sort((left, right) => right.issuedOn.localeCompare(left.issuedOn))[0];
      expect(vendor.lastNumber, vendor.name).toBe(latest?.number);
    }

    const kite = summaries.find((vendor) => vendor.name === "Kite Analytics");
    expect(kite).toMatchObject({ openCount: 0, outstandingCents: 0, lastNumber: "INV-1802", terms: "Net 30" });
    expect(balanceBucket(kite?.outstandingCents ?? -1)).toBe("No balance");

    const helios = summaries.find((vendor) => vendor.name === "Helios Freight");
    expect(helios?.openCount).toBe(2);
    expect(balanceBucket(helios?.outstandingCents ?? 0)).toBe("Over $10,000");
    expect(formatMoney(helios?.outstandingCents ?? 0)).toBe("$14,740.50");

    const northwind = sampleInvoices.find((invoice) => invoice.id === "inv-1842");
    expect(northwind?.due).toBe("Nov 18, 2026");
    expect(dueBucket(northwind?.dueOn ?? "")).toBe("Due in 30 days");
    const overdue = sampleInvoices.find((invoice) => invoice.id === "inv-1936");
    expect(dueBucket(overdue?.dueOn ?? "")).toBe("Overdue");
  });
});