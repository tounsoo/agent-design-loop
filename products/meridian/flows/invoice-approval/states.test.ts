import { describe, expect, it } from "vitest";
import { lineTotal, sampleInvoices } from "./states";

describe("sample ledger", () => {
  it("has lines that add up to each invoice's amount", () => {
    for (const invoice of sampleInvoices) {
      expect(lineTotal(invoice), invoice.number).toBe(invoice.amountCents);
    }
  });
});
