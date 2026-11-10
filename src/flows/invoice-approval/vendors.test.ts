import { describe, expect, it } from "vitest";
import { sampleInvoices } from "./states";
import { invoicesForVendor, outstandingCents, sampleVendors, vendorById, vendorByName } from "./vendors";

describe("vendor master data", () => {
  it("joins every invoice vendor and gives each vendor at least one invoice", () => {
    const names = new Set(sampleVendors.map((vendor) => vendor.legalName));
    for (const invoice of sampleInvoices) {
      expect(names.has(invoice.vendor)).toBe(true);
      expect(vendorByName(invoice.vendor)?.legalName).toBe(invoice.vendor);
    }
    for (const vendor of sampleVendors) {
      expect(sampleInvoices.some((invoice) => invoice.vendor === vendor.legalName)).toBe(true);
    }
    expect(new Set(sampleVendors.map((vendor) => vendor.id)).size).toBe(sampleVendors.length);
    expect(new Set(sampleVendors.map((vendor) => vendor.taxId)).size).toBe(sampleVendors.length);
  });

  it("keeps outstanding balance equal to invoices that are not approved", () => {
    expect(outstandingCents(sampleInvoices, "Northwind Office Supply")).toBe(428_000);
    expect(outstandingCents(sampleInvoices, "Helios Freight")).toBe(1_264_050);
    expect(outstandingCents(sampleInvoices, "Lumen Cloud Services")).toBe(89_000 + 276_000);
    expect(outstandingCents(sampleInvoices, "Harbor & Pine Catering")).toBe(64_075 + 41_000);
    expect(outstandingCents(sampleInvoices, "Kite Analytics")).toBe(0);
    expect(vendorById("kite-analytics")?.legalName).toBe("Kite Analytics");
  });

  it("lists a vendor's invoices soonest due date first", () => {
    expect(invoicesForVendor(sampleInvoices, "Northwind Office Supply").map((invoice) => invoice.number)).toEqual([
      "INV-1711",
      "INV-1842",
    ]);
  });
});
