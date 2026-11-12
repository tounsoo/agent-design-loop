import { describe, expect, it } from "vitest";
import { resolveLength, scaleFrom, typeScaleTokens } from "./tokens";

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

describe("typeScaleTokens", () => {
  it("names the numbered font sizes and skips private tokens", () => {
    expect(typeScaleTokens(TODAE_LIKE, "--_ds-")).toEqual(["--ds-font-size-1", "--ds-font-size-2", "--ds-font-size-3", "--ds-font-size-4", "--ds-font-size-5", "--ds-font-size-6"]);
  });

  it("picks the family with the most members", () => {
    const css = "--a-font-size-1: 1px; --a-font-size-2: 2px; --a-font-size-3: 3px; --b-font-size-1: 10px; --b-font-size-2: 20px; --b-font-size-3: 30px; --b-font-size-4: 40px;";
    expect(typeScaleTokens(css, "--_")).toHaveLength(4);
  });

  it("takes values it cannot parse, since Chrome sizes them", () => {
    const css = "--x-font-size-1: clamp(1rem, 2vw, 2rem); --x-font-size-2: calc(1em + 2px); --x-font-size-3: 2em;";
    expect(typeScaleTokens(css, "--_x-")).toHaveLength(3);
  });

  it("throws when no family has three members", () => {
    expect(() => typeScaleTokens("--x-font-size-1: 12px; --x-font-size-2: 14px;", "--_x-")).toThrow("has no type scale");
  });
});

describe("scaleFrom", () => {
  const step = (name: string, px: number) => ({ name, px });

  it("sorts by size, not by number", () => {
    expect(scaleFrom([step("a1", 30), step("a2", 12), step("a3", 20)]).map((s) => s.name)).toEqual(["a2", "a3", "a1"]);
  });

  it("counts two tokens of one size as one step, and leaves out tokens not set", () => {
    expect(scaleFrom([step("a1", 12), step("a2", 12), step("a3", 16), step("a4", 0), step("a5", 20)]).map((s) => s.px)).toEqual([12, 16, 20]);
  });

  it("throws when fewer than three steps are set", () => {
    expect(() => scaleFrom([step("a1", 12), step("a2", 0), step("a3", 12)])).toThrow("has no type scale on the page");
  });
});
