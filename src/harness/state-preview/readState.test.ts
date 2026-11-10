import { describe, expect, it } from "vitest";
import { readPreview } from "./readState";

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
});
