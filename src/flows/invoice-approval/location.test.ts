import { describe, expect, it } from "vitest";
import { readLocation } from "../../harness/state-preview/readState";
import { flowFromLocation } from "./location";
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

  it("lets a modeled preview override the ledger", () => {
    expect(flowFromLocation(readLocation("?state=loading&invoice=inv-1842"), sampleInvoices).status).toBe("loading");
    expect(flowFromLocation(readLocation("?state=ready&page=collection&route=vendors"), sampleInvoices)).toEqual({
      status: "ready",
      screen: "collection",
    });
    expect(flowFromLocation(readLocation(""), sampleInvoices)).toEqual({ status: "ready", screen: "collection" });
  });
});