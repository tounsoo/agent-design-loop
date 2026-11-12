import { describe, expect, it } from "vitest";
import { resolveLength, typeScale } from "./tokens";

const TODAE_LIKE = `
:root {
  --ds-font-size-1: 0.75rem;
  --ds-font-size-2: 14px;
  --ds-font-size-3: var(--ds-base-size);
  --ds-base-size: 16px;
  --ds-font-size-4: 20px;
  --ds-font-size-5: var(--_ds-private, 24px);
  --ds-font-size-6: 30px;
  --_ds-font-size-1: 99px;
  --_ds-font-size-2: 98px;
  --_ds-font-size-3: 97px;
  --_ds-font-size-4: 96px;
}
`;

describe("resolveLength", () => {
  it("follows tokens and private fallbacks to a length", () => {
    expect(resolveLength(TODAE_LIKE, "--ds-font-size-3", "--_ds-")).toBe(16);
    expect(resolveLength(TODAE_LIKE, "--ds-font-size-5", "--_ds-")).toBe(24);
    expect(resolveLength(TODAE_LIKE, "--ds-font-size-1", "--_ds-")).toBe(12);
  });

  it("names a missing token and a cycle", () => {
    expect(() => resolveLength(TODAE_LIKE, "--ds-gone", "--_ds-")).toThrow("missing --ds-gone");
    expect(() => resolveLength("--a: var(--b); --b: var(--a);", "--a", "--_")).toThrow("cycle at --a");
  });

  it("reads the last declaration in a block with no semicolon", () => {
    expect(resolveLength(":root { --a: 8px }", "--a", "--_")).toBe(8);
  });
});

describe("typeScale", () => {
  it("reads the numbered font sizes, smallest first, and skips private tokens", () => {
    expect(typeScale(TODAE_LIKE, "--_ds-").map((step) => step.px)).toEqual([12, 14, 16, 20, 24, 30]);
  });

  it("sorts by size, not by number", () => {
    const css = "--x-font-size-1: 30px; --x-font-size-2: 12px; --x-font-size-3: 20px;";
    expect(typeScale(css, "--_x-").map((step) => step.name)).toEqual(["--x-font-size-2", "--x-font-size-3", "--x-font-size-1"]);
  });

  it("counts two tokens of one size as one step", () => {
    const css = "--x-font-size-1: 12px; --x-font-size-2: 12px; --x-font-size-3: 16px; --x-font-size-4: 20px;";
    expect(typeScale(css, "--_x-").map((step) => step.px)).toEqual([12, 16, 20]);
  });

  it("picks the family with the most steps", () => {
    const css = "--a-font-size-1: 1px; --a-font-size-2: 2px; --a-font-size-3: 3px; --b-font-size-1: 10px; --b-font-size-2: 20px; --b-font-size-3: 30px; --b-font-size-4: 40px;";
    expect(typeScale(css, "--_").map((step) => step.px)).toEqual([10, 20, 30, 40]);
  });

  it("throws when no family has three steps", () => {
    expect(() => typeScale("--x-font-size-1: 12px; --x-font-size-2: 14px;", "--_x-")).toThrow("has no type scale");
  });
});
