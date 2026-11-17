import { describe, expect, it } from "vitest";
import { buildReport, finding, scenarioOf, type CheckReport } from "./report";

describe("finding", () => {
  it("lifts the first file and line a printed line names", () => {
    expect(finding("products/nook/src/page.tsx:12: primary slot is missing on Page.")).toEqual({
      message: "products/nook/src/page.tsx:12: primary slot is missing on Page.",
      file: "products/nook/src/page.tsx",
      line: 12,
    });
    expect(finding('priority: "Pay" at src/a.tsx:3 has a computed variant, and src/b.tsx:9 too.')).toMatchObject({ file: "src/a.tsx", line: 3 });
  });

  it("leaves a line with no file and line, or only an address, without a location", () => {
    expect(finding("step budget: within budget.")).toEqual({ message: "step budget: within budget." });
    expect(finding("served at http://127.0.0.1:4173/")).toEqual({ message: "served at http://127.0.0.1:4173/" });
    expect(finding("see products/nook/harness.config.ts")).toEqual({ message: "see products/nook/harness.config.ts" });
  });

  it("takes the location the check gives over one in the line", () => {
    expect(finding("x.tsx:1: y", { file: "views.tsx", state: "empty" })).toEqual({ message: "x.tsx:1: y", file: "views.tsx", state: "empty" });
  });
});

describe("scenarioOf", () => {
  const scenarios = [
    { id: "room", state: "browsing" },
    { id: "room-long", state: "browsing-long" },
  ];
  it("names the scenario a line starts with, the longest id that fits", () => {
    expect(scenarioOf("scenario room-long, booking page: no h1.", scenarios)).toEqual({ scenario: "room-long", state: "browsing-long" });
    expect(scenarioOf("scenario room: a button has no name.", scenarios)).toEqual({ scenario: "room", state: "browsing" });
    expect(scenarioOf("room at 390 by 844, light: too small", scenarios, true)).toEqual({ scenario: "room", state: "browsing" });
  });
  it("names none for an id that only starts the same", () => {
    expect(scenarioOf("scenario roomy: x", scenarios)).toEqual({});
    expect(scenarioOf("a file is missing.", scenarios)).toEqual({});
  });
});

describe("buildReport", () => {
  it("passes on exit code 0 and fails on any other", () => {
    expect(buildReport({ check: "check:a", config: "c.ts", code: 0, findings: [] })).toEqual({ check: "check:a", config: "c.ts", status: "pass", findings: [] });
    const found = [finding("a.tsx:2: wrong")];
    expect(buildReport({ check: "check:a", config: null, code: 1, findings: found })).toEqual({ check: "check:a", config: null, status: "fail", findings: found });
  });

  it("gives a failure with no finding one that says so", () => {
    expect(buildReport({ check: "check:a", config: null, code: 2, findings: [] }).findings).toEqual([{ message: "check:a exited with status 2 and printed no reason." }]);
  });

  it("keeps the reports of the checks a run ran, and adds no reason when one of them has it", () => {
    const checks: CheckReport[] = [
      { check: "check:opt-outs", config: "c.ts", status: "pass", findings: [] },
      { check: "check:b", config: "c.ts", status: "fail", findings: [{ message: "b broke" }] },
      { check: "check:c", config: "c.ts", status: "not-run", findings: [] },
    ];
    expect(buildReport({ check: "check:product", config: "c.ts", code: 1, findings: [], checks })).toEqual({ check: "check:product", config: "c.ts", status: "fail", findings: [], checks });
  });
});

