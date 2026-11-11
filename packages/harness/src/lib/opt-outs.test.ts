import { describe, expect, it } from "vitest";
import { optOutLines, retirementCandidates, type OptOutProduct } from "./opt-outs";

function product(source: string, ...rules: string[]): OptOutProduct {
  return { source, proposals: "proposals", optOuts: Object.fromEntries(rules.map((rule) => [rule, `proposals/${source}-${rule}.md`])) };
}

describe("retirementCandidates", () => {
  it("flags nothing when only one of two products opts out", () => {
    expect(retirementCandidates([product("a", "check:disclosure"), product("b")])).toEqual([]);
  });

  it("flags a rule both of two products opt out of", () => {
    expect(retirementCandidates([product("b", "check:disclosure"), product("a", "check:disclosure")])).toEqual([
      { rule: "check:disclosure", products: ["a", "b"], of: 2 },
    ]);
  });

  it("flags two of three products, a majority", () => {
    const products = [product("a", "check:priority"), product("b", "check:priority"), product("c")];
    expect(retirementCandidates(products).map((candidate) => candidate.rule)).toEqual(["check:priority"]);
  });

  it("does not flag two of four products, which is not a majority", () => {
    const products = [product("a", "check:priority"), product("b", "check:priority"), product("c"), product("d")];
    expect(retirementCandidates(products)).toEqual([]);
  });

  it("does not flag a lone product's opt-out, even though it is all products", () => {
    expect(retirementCandidates([product("a", "check:priority")])).toEqual([]);
  });
});

describe("optOutLines", () => {
  it("reads each Opts out line's rule and product", () => {
    const text = "Status: decided.\n\nOpts out: `check:disclosure` for `products/nook`\nOpts out: `check:priority` for `products/nook`.\n";
    expect(optOutLines(text)).toEqual([
      { rule: "check:disclosure", source: "products/nook" },
      { rule: "check:priority", source: "products/nook" },
    ]);
  });

  it("ignores an example inside a fenced code block", () => {
    const text = "Status: decided.\n\n```md\nOpts out: `check:disclosure` for `products/nook`\n```\n";
    expect(optOutLines(text)).toEqual([]);
  });

  it("ignores a mention inside a sentence", () => {
    expect(optOutLines("This proposal Opts out: `check:disclosure` for `products/nook` in prose.")).toEqual([]);
  });
});
