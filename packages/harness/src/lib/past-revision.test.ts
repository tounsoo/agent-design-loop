import { describe, expect, it } from "vitest";
import { pastOrSkip, showPast } from "./past-revision";

const missing = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

describe("past-revision", () => {
  it("returns undefined when the commit is not in this clone", () => {
    expect(showPast(missing, "AGENTS.md")).toBeUndefined();
  });

  it("skips with a needs-full-history message when the commit is missing", () => {
    const ctx = {
      note: "",
      skip(note?: string): never {
        this.note = note ?? "";
        throw new Error("skip");
      },
    };
    expect(() => pastOrSkip(ctx, missing, "AGENTS.md")).toThrow("skip");
    expect(ctx.note).toBe(`needs full history: ${missing} is not in this clone`);
  });
});
