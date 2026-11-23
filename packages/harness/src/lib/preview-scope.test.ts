import { describe, expect, it } from "vitest";
import { pastOrSkip } from "./past-revision";
import { previewScopeProblems } from "./preview-scope";

const APP = "products/meridian/App.tsx";
const PAGE = "products/meridian/features/invoice-approval/InvoiceApproval.tsx";

function pair(ctx: { skip: (note?: string) => never }, rev: string): Map<string, string> {
  return new Map([
    [APP, pastOrSkip(ctx, rev, APP)],
    [PAGE, pastOrSkip(ctx, rev, PAGE)],
  ]);
}

describe("preview-scope", () => {
  it("fails the title and the page from before 3a3c7d7, where the title searched every known vendor and the page searched the preview", (ctx) => {
    const problems = previewScopeProblems(pair(ctx, "3a3c7d7^")).join("\n");
    expect(problems).toContain("knownVendors().find");
    expect(problems).toContain("shownVendors.some (previewVendors)");
    expect(problems).toContain("openVendor");
  });

  it("fails the title at 3a3c7d7, which searched previewVendors and so missed a vendor once the link left the preview", (ctx) => {
    const problems = previewScopeProblems(pair(ctx, "3a3c7d7")).join("\n");
    expect(problems).toContain("previewVendors().find");
    expect(problems).toContain("openVendor");
  });

  it("fails filter()[0], findIndex and for-of on shownVendors", () => {
    const page = [
      "const shownVendors = previewVendors(state, added);",
      "const first = shownVendors.filter((vendor) => vendor.id === id)[0];",
      "const index = shownVendors.findIndex((vendor) => vendor.id === id);",
      "const last = shownVendors.findLast((vendor) => vendor.id === id);",
      "for (const vendor of shownVendors) vendor.id;",
    ].join("\n");
    const problems = previewScopeProblems(new Map([[PAGE, page]])).join("\n");
    expect(problems).toContain("shownVendors.filter (previewVendors)");
    expect(problems).toContain("shownVendors.findIndex (previewVendors)");
    expect(problems).toContain("shownVendors.findLast (previewVendors)");
    expect(problems).toContain("for…of shownVendors (previewVendors)");
  });
});
