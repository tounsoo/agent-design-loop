import { describe, expect, it } from "vitest";
import { readLocation } from "../../harness/state-preview/readState";
import { flowFromLocation, isVendorDetail, vendorHref } from "./location";
import { sampleInvoices } from "./states";

describe("flow from location", () => {
  it("opens a pending invoice as detail and a settled invoice as its outcome", () => {
    expect(flowFromLocation(readLocation("?invoice=inv-1842"), sampleInvoices)).toMatchObject({
      status: "ready",
      screen: "detail",
      invoiceId: "inv-1842",
    });
    expect(flowFromLocation(readLocation("?invoice=inv-1711"), sampleInvoices).status).toBe("invoice-approved");
    expect(flowFromLocation(readLocation("?invoice=inv-1744"), sampleInvoices)).toMatchObject({
      status: "changes-requested",
      invoiceId: "inv-1744",
      reason: "Seat count is higher than the contract.",
    });
  });

  it("keeps a vendor record off the invoice flow", () => {
    const location = readLocation(vendorHref("northwind-office-supply"));
    expect(isVendorDetail(location)).toBe(true);
    expect(flowFromLocation(location, sampleInvoices)).toEqual({ status: "ready", screen: "collection" });
    expect(isVendorDetail(readLocation("?route=vendors&vendor=missing"))).toBe(false);
    expect(isVendorDetail(readLocation("?route=vendors&vendor=northwind-office-supply&invoice=inv-1842"))).toBe(false);
    expect(
      flowFromLocation(readLocation("?route=vendors&vendor=northwind-office-supply&invoice=inv-1842"), sampleInvoices),
    ).toMatchObject({ status: "ready", screen: "detail", invoiceId: "inv-1842" });
    expect(isVendorDetail(readLocation("?state=loading&route=vendors&vendor=northwind-office-supply"))).toBe(false);
  });

  it("lets a modeled preview override the ledger", () => {
    expect(flowFromLocation(readLocation("?state=loading&invoice=inv-1842"), sampleInvoices).status).toBe("loading");
    expect(flowFromLocation(readLocation("?state=ready&page=collection&route=vendors"), sampleInvoices)).toEqual({
      status: "ready",
      screen: "collection",
    });
    expect(flowFromLocation(readLocation(""), sampleInvoices)).toEqual({ status: "ready", screen: "collection" });
  });
});