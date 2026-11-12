import { describe, expect, it } from "vitest";
import { readLocation, readPreview } from "./readState";

describe("scenario preview", () => {
  it("reads a scenario's state, page and branch, and ignores an unknown id", () => {
    expect(readPreview("?scenario=invoice-approved")).toEqual({
      state: "invoice-approved",
      page: "detail",
      branch: false,
    });
    expect(readPreview("?scenario=invoice-requesting-changes").branch).toBe(true);
    expect(readPreview("?scenario=confirming")).toEqual({ state: null, page: null, branch: false });
    expect(readPreview("?state=loading")).toEqual({ state: null, page: null, branch: false });
    expect(readPreview("")).toEqual({ state: null, page: null, branch: false });
  });

  it("reads a collection route and an invoice id", () => {
    expect(readLocation("")).toMatchObject({ route: "to-approve", invoiceId: null });
    expect(readLocation("?route=invoices").route).toBe("invoices");
    expect(readLocation("?route=vendors").route).toBe("vendors");
    expect(readLocation("?route=nope").route).toBe("to-approve");
    expect(readLocation("?invoice=inv-1842")).toMatchObject({ route: "to-approve", invoiceId: "inv-1842" });
    expect(readLocation("?route=invoices&invoice=inv-1711").invoiceId).toBe("inv-1711");
    expect(readLocation("?scenario=loading&invoice=inv-1842").preview.state).toBe("loading");
  });

  it("opens a scenario's own route, then the route its state belongs to, over the one asked for", () => {
    expect(readLocation("?scenario=invoices").route).toBe("invoices");
    expect(readLocation("?scenario=vendors&route=invoices").route).toBe("vendors");
    expect(readLocation("?scenario=vendor-added").route).toBe("vendors");
    expect(readLocation("?scenario=vendor-added&route=invoices").route).toBe("vendors");
    expect(readLocation("?scenario=empty&route=vendors").route).toBe("vendors");
    expect(readLocation("?scenario=empty").route).toBe("to-approve");
  });
});
