import { describe, expect, it } from "vitest";
import { optOutProblems, retirementCandidates, unadoptedOptOuts, unretiredRemovals, type OptOutProduct } from "./opt-outs";
import type { Proposal } from "./proposals";

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

const SECTIONS = "\n## Reason\n\nNook has no disclosure.\n\n## Preview\n\nNo change on screen.\n\n## Adoption\n\nNook's config names it.\n";

function proposal(status: string, ...optsOut: string[]): string {
  const list = optsOut.length === 0 ? "opts-out: []" : `opts-out:\n${optsOut.map((entry) => `  - ${entry}`).join("\n")}`;
  return `---\nstatus: ${status}\nchanges: []\n${list}\n---\n# Proposal\n${SECTIONS}`;
}

describe("optOutProblems", () => {
  const nook = { source: "products/nook", proposals: "proposals", optOuts: { "check:disclosure": "proposals/0011-skip.md" } };
  const rules = ["check:disclosure", "check:priority"];

  it("accepts an adopted proposal that opts the product out of the rule", () => {
    expect(optOutProblems(nook, rules, () => proposal("adopted", "check:disclosure for products/nook"))).toEqual([]);
  });

  it("fails a proposal that is only decided, because the opt-out applies now", () => {
    expect(optOutProblems(nook, rules, () => proposal("decided", "check:disclosure for products/nook")).join("\n")).toContain("is decided, not adopted");
  });

  it("fails a proposal whose opts-out names another product", () => {
    expect(optOutProblems(nook, rules, () => proposal("adopted", "check:disclosure for products/meridian")).join("\n")).toContain(
      "does not opt out check:disclosure for products/nook",
    );
  });

  it("fails a proposal that only says the words in prose", () => {
    const text = "Status: decided.\n\nOpts out: `check:disclosure` for `products/nook`\n\nreason, preview, adoption";
    expect(optOutProblems(nook, rules, () => text).join("\n")).toContain("has no front matter");
  });
});

function decided(file: string, retires: string[] = [], optsOut: { rule: string; source: string }[] = []): Proposal {
  return { file, status: "decided", changes: [], retires, optsOut, adds: [] };
}

describe("unretiredRemovals", () => {
  it("passes when no rule leaves check:rules", () => {
    expect(unretiredRemovals(["check:priority"], ["check:priority", "check:new"], [])).toEqual([]);
  });

  it("fails a rule taken out with no adopted proposal that retires it", () => {
    expect(unretiredRemovals(["check:priority", "check:disclosure"], ["check:priority"], [decided("p.md", ["check:priority"])]).join("\n")).toContain(
      "check:disclosure left check:rules without a proposal that retires it",
    );
  });

  it("passes a rule an adopted proposal retires", () => {
    expect(unretiredRemovals(["check:disclosure"], [], [decided("p.md", ["check:disclosure"])])).toEqual([]);
  });
});

describe("unadoptedOptOuts", () => {
  const nook = { source: "products/nook", proposals: "proposals", optOuts: { "check:disclosure": "proposals/0011-skip.md" } };

  it("passes an opt-out the base already had", () => {
    expect(unadoptedOptOuts(nook, { "check:disclosure": "proposals/0011-skip.md" }, [])).toEqual([]);
  });

  it("fails a new opt-out whose proposal is not adopted in this change", () => {
    expect(unadoptedOptOuts(nook, {}, []).join("\n")).toContain("is not adopted in this change");
  });

  it("fails a new opt-out whose adopted proposal was decided for another product", () => {
    const adopt = decided("proposals/0011-skip.md", [], [{ rule: "check:disclosure", source: "products/meridian" }]);
    expect(unadoptedOptOuts(nook, null, [adopt]).join("\n")).toContain("did not opt out check:disclosure for products/nook when it was decided");
  });

  it("passes a new opt-out that adopts its decided proposal", () => {
    const adopt = decided("proposals/0011-skip.md", [], [{ rule: "check:disclosure", source: "products/nook" }]);
    expect(unadoptedOptOuts(nook, null, [adopt])).toEqual([]);
  });
});
