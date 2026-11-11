import { describe, expect, it } from "vitest";
import { optOutLines, proposalStatus, retirementCandidates, type OptOutProduct } from "./opt-outs";

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

  it("ignores an example in a fence closed by a longer fence, an indented fence, or an unclosed fence", () => {
    const line = "Opts out: `check:disclosure` for `products/nook`";
    expect(optOutLines(`\`\`\`\n${line}\n\`\`\`\`\n`)).toEqual([]);
    expect(optOutLines(`  ~~~md\n${line}\n  ~~~\n`)).toEqual([]);
    expect(optOutLines(`\`\`\`md\n${line}\n`)).toEqual([]);
  });

  it("ignores a line inside an HTML comment", () => {
    expect(optOutLines("<!--\nOpts out: `check:disclosure` for `products/nook`\n-->\n")).toEqual([]);
  });

  it("reads a line after a fence closes", () => {
    expect(optOutLines("```\nexample\n```\nOpts out: `check:disclosure` for `products/nook`\n")).toEqual([
      { rule: "check:disclosure", source: "products/nook" },
    ]);
  });

  it("ignores a mention inside a sentence", () => {
    expect(optOutLines("This proposal Opts out: `check:disclosure` for `products/nook` in prose.")).toEqual([]);
  });
});

describe("proposalStatus", () => {
  it("reads the word on the first Status line", () => {
    expect(proposalStatus("# Proposal\n\nStatus: decided. Ben approved it.\n")).toBe("decided");
  });

  it("does not let a later line overrule an open proposal", () => {
    expect(proposalStatus("Status: open\n\nStatus: decided\n")).toBe("open");
  });

  it("reads a hyphenated word whole", () => {
    expect(proposalStatus("Status: decided-not-really\n")).toBe("decided-not-really");
  });

  it("ignores an example in a fenced code block", () => {
    expect(proposalStatus("```md\nStatus: decided.\n```\n\nStatus: open\n")).toBe("open");
  });

  it("ignores a Status line in an HTML comment", () => {
    expect(proposalStatus("<!-- Status: decided -->\nStatus: open. Not applied.\n")).toBe("open");
  });
});
