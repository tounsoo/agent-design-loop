import { describe, expect, it } from "vitest";
import { invoiceSubtotalCents, lineAmountCents, sampleInvoices } from "./states";

describe("sample invoices", () => {
  it("keeps each bill equal to its lines plus tax", () => {
    for (const invoice of sampleInvoices) {
      const subtotal = invoiceSubtotalCents(invoice);
      expect(subtotal + invoice.taxCents, invoice.number).toBe(invoice.amountCents);
      expect(invoice.taxCents, invoice.number).toBeGreaterThanOrEqual(0);
      for (const line of invoice.lines) {
        expect(Number.isInteger(line.quantity), line.description).toBe(true);
        expect(line.quantity, line.description).toBeGreaterThan(0);
        expect(Number.isInteger(line.unitPriceCents), line.description).toBe(true);
        expect(line.unitPriceCents, line.description).toBeGreaterThan(0);
        expect(lineAmountCents(line), line.description).toBe(line.quantity * line.unitPriceCents);
      }
    }
  });

  it("keeps the queue totals reviewers already see", () => {
    const totals = Object.fromEntries(sampleInvoices.map((invoice) => [invoice.id, invoice.amountCents]));
    expect(totals).toMatchObject({
      "inv-1842": 428_000,
      "inv-1907": 1_264_050,
      "inv-1760": 89_000,
      "inv-1914": 215_000,
      "inv-1888": 64_075,
      "inv-1922": 348_000,
      "inv-1855": 112_500,
      "inv-1711": 98_000,
      "inv-1694": 821_000,
      "inv-1802": 640_000,
      "inv-1744": 276_000,
      "inv-1770": 41_000,
    });
  });
});
