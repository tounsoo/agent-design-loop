import { describe, expect, it } from "vitest";
import { parseCovers, productName, renderChromeDrive, renderClaudeProducts, renderMapProducts, verifyMapProblems, type ProductRegistry } from "./verify-map";

const shop: ProductRegistry = {
  name: "shop",
  config: "products/shop/harness.config.ts",
  pageTypes: [
    { id: "cart", kind: "primary slot" },
    { id: "catalog", kind: "collection" },
  ],
  layouts: ["frame"],
  contentLayouts: ["item-grid", "totals"],
  tasks: ["check-out"],
  scenarios: ["loading", "cart-full"],
};

const INDEX = "# Shop\n\n- [Browse](browse.md): the catalog.\n- [Check out](check-out.md): the task.\n";
const BROWSE = "# Browse\n\nOpen `?scenario=loading`.\n\n## Covers\n\n- Page types: `catalog`\n- Layouts: `frame`\n- Content layouts: `item-grid`\n- Scenarios: `?scenario=loading`\n";
const CHECK_OUT = "# Check out\n\n## Gotchas\n\n- None.\n\n## Covers\n\n- Page types: `cart`\n- Content layouts: `totals`\n- Tasks: `check-out`\n- Scenarios: `?scenario=cart-full`\n";

function map(overrides: Record<string, string | null> = {}): Map<string, string> {
  const files = new Map<string, string>([
    ["README.md", "# Verification map\n"],
    ["shop/README.md", INDEX],
    ["shop/browse.md", BROWSE],
    ["shop/check-out.md", CHECK_OUT],
  ]);
  for (const [file, text] of Object.entries(overrides)) {
    if (text === null) files.delete(file);
    else files.set(file, text);
  }
  return files;
}

describe("productName", () => {
  it("is the folder the config sits in", () => {
    expect(productName("products/meridian/harness.config.ts")).toBe("meridian");
  });
});

describe("parseCovers", () => {
  it("reads each kind's code spans, scenarios as their ids", () => {
    const parsed = parseCovers("f.md", BROWSE);
    expect(parsed?.problems).toEqual([]);
    expect(Object.fromEntries(parsed?.covers ?? [])).toEqual({ pageTypes: ["catalog"], layouts: ["frame"], contentLayouts: ["item-grid"], scenarios: ["loading"] });
  });

  it("is null without a Covers section, and ignores one in a code block", () => {
    expect(parseCovers("f.md", "# F\n\n```md\n## Covers\n\n- Tasks: `x`\n```\n")).toBeNull();
  });

  it("stops at the next heading", () => {
    const parsed = parseCovers("f.md", "## Covers\n\n- Tasks: `a`\n\n## Later\n\n- Tasks: `b`\n");
    expect(parsed?.covers.get("tasks")).toEqual(["a"]);
  });

  it("names a line that is not a kind, a kind with no span, a scenario not written as its URL and an empty section", () => {
    expect(parseCovers("f.md", "## Covers\n\n- Sections: `a`\n")?.problems[0]).toContain('"- Sections: `a`" under ## Covers is not a "- <kind>: `<name>`" line');
    expect(parseCovers("f.md", "## Covers\n\n- Tasks: check-out\n")?.problems[0]).toContain('"- Tasks:" under ## Covers names nothing');
    expect(parseCovers("f.md", "## Covers\n\n- Scenarios: `loading`\n")?.problems[0]).toContain("the scenario `loading` under ## Covers is not written as `?scenario=<id>`");
    expect(parseCovers("f.md", "## Covers\n\n")?.problems[0]).toContain("its ## Covers section lists nothing");
  });
});

describe("verifyMapProblems", () => {
  it("passes a map that covers everything the product has, and nothing else", () => {
    expect(verifyMapProblems([shop], map())).toEqual([]);
  });

  it("fails a product with no folder", () => {
    const problems = verifyMapProblems([shop], map({ "shop/README.md": null, "shop/browse.md": null, "shop/check-out.md": null }));
    expect(problems[0]).toContain("products/shop/harness.config.ts has no verify map: add .claude/skills/verify/features/shop/README.md");
  });

  it("fails each kind a product has that no feature file covers", () => {
    const added: ProductRegistry = {
      ...shop,
      pageTypes: [...shop.pageTypes, { id: "receipt", kind: "content" }],
      layouts: [...shop.layouts, "drawer"],
      contentLayouts: [...shop.contentLayouts, "order-lines"],
      tasks: [...shop.tasks, "return-item"],
      scenarios: [...shop.scenarios, "receipt"],
    };
    const problems = verifyMapProblems([added], map());
    expect(problems).toEqual([
      expect.stringContaining("shop's page type `receipt` is in no feature file of its verify map"),
      expect.stringContaining("shop's layout `drawer` is in no feature file"),
      expect.stringContaining("shop's content layout `order-lines` is in no feature file"),
      expect.stringContaining("shop's task `return-item` is in no feature file"),
      expect.stringContaining('shop\'s scenario `receipt` is in no feature file of its verify map. Say how to reach and drive it in a feature file under .claude/skills/verify/features/shop/, and name it as `?scenario=receipt` on its "- Scenarios:" line'),
    ]);
  });

  it("fails a Covers line that names what the product no longer has", () => {
    const removed: ProductRegistry = { ...shop, contentLayouts: ["item-grid"] };
    expect(verifyMapProblems([removed], map())).toEqual([expect.stringContaining(".claude/skills/verify/features/shop/ covers the content layout `totals`, which shop does not have")]);
  });

  it("fails a ?scenario= URL anywhere in the folder that opens no scenario of the product", () => {
    const problems = verifyMapProblems([shop], map({ "shop/browse.md": BROWSE.replace("Open `?scenario=loading`.", "Open `?scenario=gone&route=x`.") }));
    expect(problems).toEqual([expect.stringContaining("shop/browse.md opens `?scenario=gone`, which is not a scenario of shop")]);
  });

  it("fails a feature file the index does not link, and a link to a file that is not there", () => {
    expect(verifyMapProblems([shop], map({ "shop/README.md": "- [Browse](browse.md)\n- [Gone](gone.md)\n" }))).toEqual([
      ".claude/skills/verify/features/shop/README.md does not link check-out.md. List every feature file in the index.",
      ".claude/skills/verify/features/shop/README.md links gone.md, which is not in .claude/skills/verify/features/shop/.",
    ]);
  });

  it("fails a feature file with no Covers section, so what it drives counts as uncovered", () => {
    const problems = verifyMapProblems([shop], map({ "shop/check-out.md": "# Check out\n" }));
    expect(problems[0]).toContain(".claude/skills/verify/features/shop/check-out.md has no ## Covers section");
    expect(problems).toContainEqual(expect.stringContaining("shop's task `check-out` is in no feature file"));
  });

  it("fails a folder that is no product's, and two products that would share a folder", () => {
    expect(verifyMapProblems([shop], map({ "old/README.md": "# Old\n" }))).toEqual([expect.stringContaining(".claude/skills/verify/features/old/ is not a product's verify map")]);
    const twin: ProductRegistry = { ...shop, config: "apps/shop/harness.config.ts" };
    expect(verifyMapProblems([shop, twin], map())[0]).toContain("apps/shop/harness.config.ts and products/shop/harness.config.ts would share the verify map folder");
  });
});

describe("renderers", () => {
  it("lists each product with what it registers, its map and its Chrome drive", () => {
    expect(renderClaudeProducts([shop])).toBe(
      "- [`shop`](products/shop/harness.config.ts), verify map [.claude/skills/verify/features/shop/](.claude/skills/verify/features/shop/README.md): page types `cart` (primary slot), `catalog` (collection); layouts `frame`; content layouts `item-grid`, `totals`; tasks `check-out`; 2 scenarios.",
    );
    expect(renderMapProducts([shop])).toBe("- [shop](shop/README.md), from `products/shop/harness.config.ts`: 2 page types, 1 layout, 2 content layouts, 1 task and 2 scenarios.");
    expect(renderChromeDrive([shop], ["check:a", "check:b"])).toBe(
      "```sh\nnpm run check:a -- --config products/shop/harness.config.ts\nnpm run check:b -- --config products/shop/harness.config.ts\n```",
    );
  });
});
