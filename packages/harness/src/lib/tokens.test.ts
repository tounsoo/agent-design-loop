import { describe, expect, it } from "vitest";
import { resolveLength } from "./tokens";

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
