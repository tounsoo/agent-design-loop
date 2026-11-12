import { describe, expect, it } from "vitest";
import { readLocation, readPreview } from "./readState";

describe("state preview harness", () => {
  it("reads a modeled state, a page, and ignores unknown names", () => {
    expect(readPreview("?state=invoice-approved&page=detail")).toEqual({
      state: "invoice-approved",
      page: "detail",
      branch: false,
    });
    expect(readPreview("?state=ready&page=detail&branch=request").branch).toBe(true);
    expect(readPreview("?state=confirming")).toEqual({ state: null, page: null, branch: false });
    expect(readPreview("")).toEqual({ state: null, page: null, branch: false });
  });

  it("reads a collection route and an invoice id", () => {
    expect(readLocation("")).toMatchObject({ route: "to-approve", invoiceId: null });
    expect(readLocation("?route=invoices").route).toBe("invoices");
    expect(readLocation("?route=vendors").route).toBe("vendors");
    expect(readLocation("?route=nope").route).toBe("to-approve");
    expect(readLocation("?invoice=inv-1842")).toMatchObject({ route: "to-approve", invoiceId: "inv-1842" });
    expect(readLocation("?route=invoices&invoice=inv-1711").invoiceId).toBe("inv-1711");
    expect(readLocation("?state=loading&invoice=inv-1842").preview.state).toBe("loading");
  });

  it("opens the route a previewed state belongs to, over the one asked for", () => {
    expect(readLocation("?state=vendor-added").route).toBe("vendors");
    expect(readLocation("?state=vendor-added&route=invoices").route).toBe("vendors");
    expect(readLocation("?state=empty&route=vendors").route).toBe("vendors");
    expect(readLocation("?state=empty").route).toBe("to-approve");
  });
});

