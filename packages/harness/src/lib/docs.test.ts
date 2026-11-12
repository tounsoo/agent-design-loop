import { describe, expect, it } from "vitest";
import type { CheckMeta } from "./check-meta";
import { anchor, apply, buildModel, docComment, facts, gateSteps, renderBlockers, renderNoChrome, renderReference, type FixtureCase, type Sources } from "./docs";

const sources: Record<string, string> = {
  "check-a.ts": 'import { loadConfig } from "./lib/config";\nimport { resolveBaseRev } from "./lib/base";\n',
  "check-b.ts": 'import type { Thing } from "./lib/config";\nimport { openPage } from "./lib/chrome";\n',
  "check-c.ts": "// mentions puppeteer-core and resolveBaseRev only in prose\n",
  "lib/config.ts": "export const config = 1;\n",
  "lib/base.ts": "export function resolveBaseRev() {}\n",
  "lib/chrome.ts": 'import puppeteer from "puppeteer-core";\n',
};
const read: Sources = (file) => {
  const text = sources[file];
  if (text === undefined) throw new Error(`no ${file}`);
  return text;
};

const scripts = {
  check: "npm run lint && npm run check:one && npm run check:c",
  lint: "eslint .",
  "check:one": "npm run check:product -- --config products/one/harness.config.ts",
  "check:product": "tsx packages/harness/src/check-product.ts",
  "check:rules": "npm run check:a && npm run check:b",
  "check:a": "tsx packages/harness/src/check-a.ts",
  "check:b": "tsx packages/harness/src/check-b.ts",
  "check:c": "tsx packages/harness/src/check-c.ts",
};
const files = new Map([
  ["check:a", "check-a.ts"],
  ["check:b", "check-b.ts"],
  ["check:c", "check-c.ts"],
]);
const meta = (summary: string, extra: Partial<CheckMeta> = {}): CheckMeta => ({ summary, fails: ["Something wrong."], ...extra });
const metas = new Map<string, CheckMeta>([
  ["check-a.ts", meta("Checks a.")],
  ["check-b.ts", meta("Checks b.")],
  ["check-c.ts", meta("Checks c.")],
]);
const cases: FixtureCase[] = [
  { name: "illegal/bad-b", comment: "B is bad.", checks: [{ run: "check:b", args: [], expect: "fails", phrase: "b is bad" }] },
  { name: "listed-b", comment: "Lists b.", checks: [{ run: "check:b", args: ["--list"], expect: "passes", phrase: "listed" }] },
];

function model() {
  const built = buildModel({ scripts, files, metas, read, cases });
  if ("problems" in built) throw new Error(built.problems.join("\n"));
  return built.model;
}

describe("facts", () => {
  it("reads --config, the base and Chrome from value imports, not prose or type imports", () => {
    expect(facts("check-a.ts", read)).toEqual({ config: true, base: true, chrome: false });
    expect(facts("check-b.ts", read)).toEqual({ config: false, base: false, chrome: true });
    expect(facts("check-c.ts", read)).toEqual({ config: false, base: false, chrome: false });
  });
});

describe("reached", () => {
  it("follows .js specifiers, index files and re-exports", () => {
    const files: Record<string, string> = {
      "main.ts": 'import { a } from "./lib/a.js";\nexport { b } from "./lib/b";\n',
      "lib/a.ts": "export const a = 1;\n",
      "lib/b/index.ts": 'import puppeteer from "puppeteer-core";\n',
    };
    const readFiles: Sources = (file) => {
      const text = files[file];
      if (text === undefined) throw new Error(`no ${file}`);
      return text;
    };
    expect(facts("main.ts", readFiles).chrome).toBe(true);
  });
  it("names an import it cannot find", () => {
    expect(() => facts("main.ts", (file) => (file === "main.ts" ? 'import { x } from "./gone";\n' : (() => { throw new Error("no"); })()))).toThrow("main.ts imports ./gone");
  });
});

describe("gateSteps", () => {
  it("lists the steps in order and names the config a product step passes", () => {
    expect(gateSteps(scripts)).toEqual([
      { script: "lint", config: null },
      { script: "check:one", config: "products/one/harness.config.ts" },
      { script: "check:c", config: null },
    ]);
  });
  it("refuses a step that is not npm run", () => {
    expect(() => gateSteps({ check: "npm run lint && tsc" })).toThrow("not `npm run <script>`");
  });
});

describe("buildModel", () => {
  it("orders rule checks by check:rules, then the gate's checks", () => {
    expect(model().scripts.map((script) => script.name)).toEqual(["check:a", "check:b", "check:c"]);
  });
  it("reports a missing meta, an orphan meta and a fails-nothing check", () => {
    const built = buildModel({
      scripts,
      files,
      metas: new Map([
        ["check-a.ts", meta("A.")],
        ["check-b.ts", { summary: "B." }],
        ["check-z.ts", meta("Z.")],
      ]),
      read,
      cases,
    });
    expect("problems" in built && built.problems).toEqual([
      "npm run check:c runs check-c.ts, which has no check-c.meta.ts beside it.",
      "check-z.meta.ts describes check-z.ts, which no npm script runs.",
      "check:b's meta lists nothing it fails. A helper that fails nothing says tool: true.",
    ]);
  });
  it("reports a rule marked tool, an unknown fixture case and an unknown npm script", () => {
    const built = buildModel({
      scripts,
      files,
      metas: new Map([
        ["check-a.ts", { summary: "A.", tool: true }],
        ["check-b.ts", meta("B, as `illegal/missing` shows.")],
        ["check-c.ts", meta("C, after `npm run nowhere`.")],
      ]),
      read,
      cases: [...cases, { name: "stray", comment: "", checks: [{ run: "lint", args: [], expect: "passes", phrase: "" }] }],
    });
    expect("problems" in built && built.problems).toEqual([
      "check:a is in check:rules, so its meta cannot say tool.",
      "check:b's meta names the fixture case `illegal/missing`, which does not exist.",
      "check:c's meta names `npm run nowhere`, which package.json does not have.",
      "fixture case stray runs lint, which is not a harness script.",
    ]);
  });
});

describe("kinds", () => {
  it("calls a script whose meta takes --config a product check that needs it", () => {
    const built = buildModel({ scripts, files, metas: new Map([...metas, ["check-c.ts", meta("C.", { flags: [{ name: "--config", value: "<file>", what: "The config." }] })]]), read, cases });
    if ("problems" in built) throw new Error(built.problems.join("\n"));
    expect(renderReference(built.model)).toContain("| [`check:c`](#checkc) | Product | `--config <file>` (required) |");
  });
});

describe("renderers", () => {
  it("writes the reference with the gate, the facts and the fixture cases", () => {
    const text = renderReference(model());
    expect(text).toContain("`npm run check` runs `lint`, `check:one` and `check:c`, in that order");
    expect(text).toContain("which runs `check:opt-outs`, `check:a` and `check:b`, in that order");
    expect(text).toContain("| [`check:a`](#checka) | Rule | `--config <file>` (required) | Yes |  |  |");
    expect(text).toContain("| [`check:b`](#checkb) | Rule | none |  | Yes | 1 illegal, 1 legal |");
    expect(text).toContain('- `illegal/bad-b`: B is bad. It fails with "b is bad".');
  });
  it("leaves the Chrome rules out of the no-Chrome commands", () => {
    expect(renderNoChrome(model())).toBe(
      ["```sh", "npm run lint", "for config in products/one/harness.config.ts; do", "  for check in check:opt-outs check:a; do", '    npm run "$check" -- --config "$config" || break 2', "  done", "done", "npm run check:c", "```"].join("\n"),
    );
  });
  it("keeps the gate's order when product steps are not together", () => {
    const split = { ...scripts, check: "npm run check:one && npm run lint && npm run check:one" };
    const built = buildModel({ scripts: split, files, metas, read, cases });
    if ("problems" in built) throw new Error(built.problems.join("\n"));
    const lines = renderNoChrome(built.model).split("\n");
    expect(lines.filter((line) => line.startsWith("for config"))).toHaveLength(2);
    expect(lines.indexOf("npm run lint")).toBeGreaterThan(lines.indexOf("for config in products/one/harness.config.ts; do"));
  });
  it("counts only the Chrome cases that open a page", () => {
    expect(renderBlockers(model())).toContain("and so are the fixture case that opens a page: `illegal/bad-b`.");
  });
});

describe("apply", () => {
  const doc = "Intro\n<!-- docs:gen list start -->\nold\n<!-- docs:gen list end -->\nOutro\n";
  it("replaces what is between the markers", () => {
    expect(apply(doc, { list: "new" })).toEqual({ text: "Intro\n<!-- docs:gen list start -->\nnew\n<!-- docs:gen list end -->\nOutro\n" });
  });
  it("refuses missing or repeated markers", () => {
    expect(apply("no markers", { list: "new" })).toHaveProperty("problem");
    expect(apply(doc + doc, { list: "new" })).toHaveProperty("problem");
  });
});

describe("helpers", () => {
  it("makes GitHub's anchor", () => {
    expect(anchor("check:step-budget")).toBe("checkstep-budget");
    expect(anchor("lint:product-ui")).toBe("lintproduct-ui");
  });
  it("reads the first doc comment on one line", () => {
    expect(docComment("/**\n * One.\n * Two.\n */\nexport default {};")).toBe("One. Two.");
  });
});
