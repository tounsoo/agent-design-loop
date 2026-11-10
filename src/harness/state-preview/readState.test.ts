import { describe, expect, it } from "vitest";
import { readPreviewState } from "./readState";

describe("state preview harness", () => {
  it("reads a modeled state and ignores anything else", () => {
    expect(readPreviewState("?state=prefs-saved")).toBe("prefs-saved");
    expect(readPreviewState("state=empty")).toBe("empty");
    expect(readPreviewState("?state=confirming")).toBeNull();
    expect(readPreviewState("")).toBeNull();
  });
});
