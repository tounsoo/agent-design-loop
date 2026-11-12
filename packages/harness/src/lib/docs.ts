import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CheckMeta } from "./check-meta";
import { BASE_DOC } from "./base";
import { CHROME_DOC } from "./chrome";
import { defaultExportLiteral, isRecord } from "./parse-config";
import { ruleChecks } from "./scripts";

/**
 * The check reference, written from the code. Each harness script's meta
 * gives what only prose can say; everything else is read here: the script
 * names and the build gate from package.json, the rule checks from
 * `check:rules`, what a script reads from what its file imports and calls,
 * and the fixture cases from each case.ts and the doc comment above it.
 *
 * `render` makes every generated doc from that model, and `apply` writes a
 * generated block into a hand-written doc between its two markers:
 *
 *   <!-- docs:gen <block> start -->
 *   <!-- docs:gen <block> end -->
 */

/** The fully generated reference, from the repository root. */
export const REFERENCE = "packages/harness/docs/checks.md";

export type FixtureCase = {
  /** The case's folder under fixtures/, such as `illegal/two-primaries`. */
  readonly name: string;
  /** The case.ts doc comment, as one line. */
  readonly comment: string;
  readonly checks: readonly { readonly run: string; readonly args: readonly string[]; readonly expect: "fails" | "passes"; readonly phrase: string }[];
};

export type Script = {
  /** The npm script, such as `check:priority`. */
  readonly name: string;
  /** Its file under the harness src folder, such as `check-priority.ts`. */
  readonly file: string;
  readonly meta: CheckMeta;
  /** Listed in `check:rules`. */
  readonly rule: boolean;
  /** Reads a product's config, so `--config <file>` is required. */
  readonly config: boolean;
  /** Compares the change with its base. */
  readonly base: boolean;
  /** Needs headless Chrome: it opens pages, or runs a script that does. */
  readonly chrome: boolean;
};

/**
 * A step of the build gate. `configs` is set on a step that runs `check:product`
 * on products: one config's path, or a shell expression that lists every
 * product's config, for a step that runs it on each product the registry finds.
 */
export type GateStep = { readonly script: string; readonly configs: string | null };

export type Model = {
  readonly scripts: readonly Script[];
  /** What `npm run check` runs, in order. A product step names the config it gives `check:product`. */
  readonly gate: readonly GateStep[];
  /** `check:rules`, in its order. */
  readonly rules: readonly string[];
  readonly cases: readonly FixtureCase[];
};

/** A source file and the harness files it imports, read as text. */
export type Sources = (file: string) => string;

/**
 * The harness files a file reaches through its value imports, itself
 * included, as paths relative to the src folder. Type-only imports load
 * nothing, so they are not followed.
 */
export function reached(file: string, read: Sources): Set<string> {
  const seen = new Set<string>();
  const readable = (name: string): boolean => {
    try {
      read(name);
      return true;
    } catch {
      return false;
    }
  };
  const visit = (current: string): void => {
    if (seen.has(current)) return;
    seen.add(current);
    const text = read(current);
    const specifiers = [
      ...[...text.matchAll(/^(?:import|export) (?!type )[^;]*?from "(\.{1,2}\/[^"]+)";/gms)].map((match) => match[1]),
      // A script it spawns, named as `new URL("./check-product.ts", import.meta.url)`, runs as part of it.
      ...[...text.matchAll(/^(?!\s*(?:\/\/|\*)).*?new URL\("(\.{1,2}\/[^"]+\.ts)", import\.meta\.url\)/gm)].map((match) => match[1]),
    ];
    for (const specifier of specifiers) {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(current), specifier ?? ""));
      const stem = base.replace(/\.(?:js|ts|tsx)$/, "");
      const target = [`${stem}.ts`, `${stem}.tsx`, `${stem}/index.ts`, `${stem}/index.tsx`].find(readable);
      if (!target) throw new Error(`${current} imports ${specifier}, which is not a .ts or .tsx file under the harness src folder.`);
      visit(target);
    }
  };
  visit(file);
  return seen;
}

/** What a script reads, from the code it reaches. */
export function facts(file: string, read: Sources): Pick<Script, "config" | "base" | "chrome"> {
  const files = [...reached(file, read)];
  return {
    config: files.includes("lib/config.ts"),
    base: files.some((name) => /^import \{[^}]*\bresolveBaseRev\b[^}]*\} from "\.{1,2}\/(?:lib\/)?base";/m.test(read(name))),
    chrome: files.some((name) => /^import [^;]* from "puppeteer-core";/m.test(read(name))),
  };
}

/**
 * What `name` runs, in order. A step is a product step when its script is
 * `npm run check:product -- --config <file>`, or runs a harness file that
 * spawns check-product.ts once per product and prints their configs with
 * `--json`, as check:products does: `source` gives a step's harness source.
 */
export function gateSteps(scripts: Readonly<Record<string, string>>, name = "check", source: (script: string) => string = () => ""): GateStep[] {
  const command = scripts[name];
  if (command === undefined) throw new Error(`package.json has no script "${name}".`);
  return command.split("&&").map((part) => {
    const step = /^npm run ([\w:-]+)$/.exec(part.trim());
    if (!step?.[1]) throw new Error(`package.json script "${name}" has a step that is not \`npm run <script>\`: ${part.trim()}.`);
    const product = /^npm run check:product -- --config (\S+)$/.exec(scripts[step[1]] ?? "");
    if (product?.[1]) return { script: step[1], configs: product[1] };
    const text = source(step[1]);
    if (/check-product\.ts/.test(text) && /"--json"/.test(text)) {
      return { script: step[1], configs: `$(npm run --silent ${step[1]} -- --json | node -e 'for (const c of JSON.parse(require("fs").readFileSync(0, "utf8"))) console.log(c)')` };
    }
    return { script: step[1], configs: null };
  });
}

/** The first doc comment in a file, on one line. */
export function docComment(text: string): string {
  const match = /\/\*\*([\s\S]*?)\*\//.exec(text);
  if (!match?.[1]) return "";
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean)
    .join(" ");
}

/** Every fixture case: each folder directly under `fixtures` or `fixtures/illegal` with a case.ts. */
export function readCases(fixtures: string): FixtureCase[] {
  const cases: FixtureCase[] = [];
  for (const container of ["", "illegal"]) {
    const dir = path.join(fixtures, container);
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const isDir = entry.isDirectory() || (entry.isSymbolicLink() && statSync(path.join(dir, entry.name)).isDirectory());
      if (!isDir || (container === "" && entry.name === "illegal")) continue;
      const file = path.join(dir, entry.name, "case.ts");
      if (!existsSync(file)) continue;
      const text = readFileSync(file, "utf8");
      const value = defaultExportLiteral(text, file, "case");
      const checks = isRecord(value) && Array.isArray(value.checks) ? value.checks : [];
      cases.push({
        name: container ? `${container}/${entry.name}` : entry.name,
        comment: docComment(text),
        checks: checks.filter(isRecord).map((check) => {
          const expect = check.fails === undefined ? "passes" : "fails";
          return {
            run: String(check.run),
            args: Array.isArray(check.args) ? check.args.map(String) : [],
            expect,
            phrase: String(check[expect]),
          };
        }),
      });
    }
  }
  return cases;
}

/** The meta files beside the scripts, by the script file they describe. */
export async function readMetas(src: string): Promise<Map<string, CheckMeta>> {
  const metas = new Map<string, CheckMeta>();
  for (const name of readdirSync(src).filter((file) => file.endsWith(".meta.ts")).sort()) {
    const module = (await import(pathToFileURL(path.resolve(src, name)).href)) as { meta?: CheckMeta };
    if (module.meta === undefined) throw new Error(`${name} does not export meta.`);
    metas.set(name.replace(/\.meta\.ts$/, ".ts"), module.meta);
  }
  return metas;
}

/**
 * The model, or the problems that stop the docs being written: a script with
 * no meta, a meta with no script, and a backticked name in a meta that names
 * no npm script or fixture case.
 */
export function buildModel(input: {
  scripts: Readonly<Record<string, string>>;
  /** The npm script names that run one harness file, with the file. */
  files: ReadonlyMap<string, string>;
  metas: ReadonlyMap<string, CheckMeta>;
  read: Sources;
  cases: readonly FixtureCase[];
}): { model: Model } | { problems: string[] } {
  const problems: string[] = [];
  const rules = ruleChecks("check:rules", new Set(), input.scripts);
  const scripts: Script[] = [];
  for (const [name, file] of input.files) {
    const meta = input.metas.get(file);
    if (!meta) {
      problems.push(`npm run ${name} runs ${file}, which has no ${file.replace(/\.ts$/, ".meta.ts")} beside it.`);
      continue;
    }
    let found: Pick<Script, "config" | "base" | "chrome">;
    try {
      found = facts(file, input.read);
    } catch (error) {
      problems.push(`npm run ${name}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    // A script that parses `--config` itself, as check:product does, says so in its meta.
    const config = found.config || (meta.flags ?? []).some((flag) => flag.name === "--config");
    scripts.push({ name, file, meta, rule: rules.includes(name), ...found, config });
  }
  const run = new Set(input.files.values());
  for (const file of input.metas.keys()) {
    if (!run.has(file)) problems.push(`${file.replace(/\.ts$/, ".meta.ts")} describes ${file}, which no npm script runs.`);
  }
  const caseNames = new Set(input.cases.map((item) => item.name));
  for (const script of scripts) {
    if (script.rule && script.meta.tool) problems.push(`${script.name} is in check:rules, so its meta cannot say tool.`);
    if (!script.meta.tool && !script.meta.fails?.length) problems.push(`${script.name}'s meta lists nothing it fails. A helper that fails nothing says tool: true.`);
    const text = [script.meta.summary, ...(script.meta.flags ?? []).map((flag) => flag.what), ...(script.meta.fails ?? []), ...(script.meta.details ?? [])].join("\n");
    for (const [, token] of text.matchAll(/`(illegal\/[\w-]+)`/g)) {
      if (token && !caseNames.has(token)) problems.push(`${script.name}'s meta names the fixture case \`${token}\`, which does not exist.`);
    }
    for (const [, token] of text.matchAll(/`npm run ([\w:-]+)/g)) {
      if (token && input.scripts[token] === undefined) problems.push(`${script.name}'s meta names \`npm run ${token}\`, which package.json does not have.`);
    }
  }
  for (const item of input.cases) {
    for (const check of item.checks) {
      if (!input.files.has(check.run)) problems.push(`fixture case ${item.name} runs ${check.run}, which is not a harness script.`);
    }
  }
  if (problems.length > 0) return { problems };
  // Rule checks in check:rules' order, then the repository checks in the order the build gate runs them, then the rest, then the tools.
  const steps = gateSteps(input.scripts, "check", (name) => {
    const file = input.files.get(name);
    return file ? input.read(file) : "";
  });
  const gate = ["check:opt-outs", ...steps.map((step) => step.script)];
  const order = (script: Script): number =>
    script.rule ? rules.indexOf(script.name) : script.meta.tool ? 3000 : gate.includes(script.name) ? 1000 + gate.indexOf(script.name) : 2000;
  scripts.sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
  return { model: { scripts, gate: steps, rules, cases: input.cases } };
}

/** GitHub's anchor for a heading. */
export function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function code(text: string): string {
  return `\`${text}\``;
}

function list(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function kind(script: Script): string {
  return script.rule ? "Rule" : script.meta.tool ? "Tool" : script.config ? "Product" : "Repository";
}

function casesFor(model: Model, script: string): FixtureCase[] {
  return model.cases.filter((item) => item.checks.some((check) => check.run === script));
}

/** The cases that open a page, so they need Chrome as the checks they run do. */
export function chromeCases(model: Model): FixtureCase[] {
  const chrome = new Set(model.scripts.filter((script) => script.chrome).map((script) => script.name));
  return model.cases.filter((item) => item.checks.some((check) => chrome.has(check.run) && !check.args.includes("--list")));
}

function flagsLine(script: Script): string {
  const flags = [...(script.config ? ["`--config <file>` (required)"] : []), ...(script.meta.flags ?? []).filter((flag) => flag.name !== "--config").map((flag) => code(`${flag.name}${flag.value ? ` ${flag.value}` : ""}`))];
  return flags.length > 0 ? list(flags) : "none";
}

function gateSentence(model: Model): string {
  const steps = model.gate.map((step) => code(step.script));
  const products = model.gate.filter((step) => step.configs !== null);
  const fixed = products.filter((step) => !step.configs?.startsWith("$("));
  const each = products.filter((step) => step.configs?.startsWith("$("));
  const checks = ["check:opt-outs", ...model.rules].map(code);
  const runs = `which runs ${list(checks)}, in that order, and skips a rule the config opts out of.`;
  return [
    `\`npm run check\` runs ${list(steps)}, in that order, and stops at the first failure.`,
    fixed.length > 0 ? `${list(fixed.map((step) => code(step.script)))} each run \`check:product\` on one product's config (${list(fixed.map((step) => code(step.configs ?? "")))}), ${runs}` : "",
    each.length > 0 ? `${list(each.map((step) => code(step.script)))} ${each.length === 1 ? "runs" : "each run"} \`check:product\` on every product's config, ${runs}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** packages/harness/docs/checks.md, whole. */
export function renderReference(model: Model): string {
  const lines: string[] = [
    "# Check reference",
    "",
    "<!-- Written by npm run docs:gen. Do not edit this file: change a script's .meta.ts beside it in packages/harness/src/, or the code, and run npm run docs:gen. npm run check:docs fails when this file is stale. -->",
    "",
    "Every script the harness runs: what it is for, what it reads and what it fails. Each script's meta, `packages/harness/src/<script>.meta.ts`, gives the words. The rest is read from the code: the script names and the build gate from `package.json`, the rule checks from `check:rules`, the flags each script accepts, whether it compares with the base or opens Chrome from the code it runs, and the fixture cases from each `case.ts` under `packages/harness/fixtures/`.",
    "",
    "## The build gate",
    "",
    "```sh",
    "npm run check:fixtures && npm run check",
    "```",
    "",
    gateSentence(model),
    "",
    `**Base.** ${list(model.scripts.filter((script) => script.base).map((script) => code(script.name)))} compare the change with its base. ${BASE_DOC}`,
    "",
    `**Chrome.** ${list(model.scripts.filter((script) => script.chrome).map((script) => code(script.name)))} need headless Chrome, because they open pages in it or run a check that does, and so do the fixture cases that run a Chrome check without \`--list\`. ${CHROME_DOC}`,
    "",
    "| Script | Kind | Flags | Base | Chrome | Fixture cases |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const script of model.scripts) {
    const cases = casesFor(model, script.name);
    const illegal = cases.filter((item) => item.name.startsWith("illegal/")).length;
    lines.push(
      `| [${code(script.name)}](#${anchor(script.name)}) | ${kind(script)} | ${flagsLine(script)} | ${script.base ? "Yes" : ""} | ${script.chrome ? "Yes" : ""} | ${cases.length > 0 ? `${illegal} illegal, ${cases.length - illegal} legal` : ""} |`,
    );
  }
  for (const script of model.scripts) {
    lines.push("", `## ${code(script.name)}`, "", script.meta.summary, "");
    const about = [
      script.rule
        ? "A rule check: `check:rules` runs it, and `check:product` runs it on each product."
        : script.meta.tool
          ? "A tool: the build gate does not run it."
          : script.config
            ? "A product check: it reads one product's config, and is not one of `check:rules`."
            : "A repository check: it reads the repository, not one product.",
      `Run it as \`npm run ${script.name}\`, from the repository root, defined in \`packages/harness/src/${script.file}\`.`,
      script.config ? "It needs `--config <file>`, a product's `harness.config.ts`, and reads every path from it." : "It takes no `--config`.",
      script.base ? "It compares the change with its base." : "",
      script.chrome ? "It needs headless Chrome." : "",
    ];
    lines.push(about.filter(Boolean).join(" "));
    const flags = (script.meta.flags ?? []).filter((flag) => flag.name !== "--config");
    if (flags.length > 0) {
      lines.push("", "Flags:", "");
      for (const flag of flags) lines.push(`- ${code(`${flag.name}${flag.value ? ` ${flag.value}` : ""}`)}: ${flag.what}`);
    }
    if (script.meta.fails?.length) {
      lines.push("", "It fails:", "");
      for (const fail of script.meta.fails) lines.push(`- ${fail}`);
    }
    for (const paragraph of script.meta.details ?? []) lines.push("", paragraph);
    const cases = casesFor(model, script.name);
    if (cases.length > 0) {
      lines.push("", `Fixture cases, under \`packages/harness/fixtures/\`, that run it:`, "");
      for (const item of cases) {
        const runs = item.checks
          .filter((check) => check.run === script.name)
          .map((check) => `${check.expect} with "${check.phrase}"${check.args.length > 0 ? ` (with ${check.args.join(" ")})` : ""}`);
        lines.push(`- ${code(item.name)}: ${item.comment} It ${list(runs)}.`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

/** The table in the harness README: each script, its kind, and what it is for. */
export function renderReadmeTable(model: Model): string {
  const lines = ["| Script | Kind | What it is for |", "| --- | --- | --- |"];
  for (const script of model.scripts) {
    lines.push(`| [${code(`npm run ${script.name}`)}](docs/checks.md#${anchor(script.name)}) | ${kind(script)} | ${script.meta.summary} |`);
  }
  return lines.join("\n");
}

/** CLAUDE.md's list: one line per script. */
export function renderClaudeList(model: Model): string {
  return model.scripts
    .map((script) => `- [${code(script.name)}](${REFERENCE}#${anchor(script.name)}), ${kind(script).toLowerCase()}${script.config ? ", needs `--config`" : ""}: ${script.meta.summary}`)
    .join("\n");
}

/** The verify skill's commands for a machine with no Chrome: the build gate with the Chrome checks left out. */
export function renderNoChrome(model: Model): string {
  const chrome = new Set(model.scripts.filter((script) => script.chrome).map((script) => script.name));
  const checks = ["check:opt-outs", ...model.rules].filter((name) => !chrome.has(name));
  // Each run of plain steps is one && line; each run of product steps is one loop over their configs, so the order stays the gate's.
  const runs: GateStep[][] = [];
  for (const step of model.gate) {
    const current = runs.at(-1);
    if (current && (current[0]?.configs === null) === (step.configs === null)) current.push(step);
    else runs.push([step]);
  }
  const lines = runs.flatMap((run) =>
    run[0]?.configs === null
      ? [run.map((step) => `npm run ${step.script}`).join(" && ")]
      : [
          `for config in ${run.map((step) => step.configs).join(" ")}; do`,
          `  for check in ${checks.join(" ")}; do`,
          '    npm run "$check" -- --config "$config" || break 2',
          "  done",
          "done",
        ],
  );
  return ["```sh", ...lines, "```"].join("\n");
}

/** The verify skill's sentence naming what needs Chrome and what compares with the base. */
export function renderBlockers(model: Model): string {
  const chrome = model.scripts.filter((script) => script.chrome && !script.meta.tool).map((script) => code(script.name));
  const tools = model.scripts.filter((script) => script.chrome && script.meta.tool).map((script) => code(script.name));
  const cases = chromeCases(model).map((item) => code(item.name));
  const base = model.scripts.filter((script) => script.base).map((script) => code(script.name));
  return [
    `Without a Chrome that starts, ${list(chrome)} are \`BLOCKED\`, and so are ${tools.length > 0 ? `${list(tools)} and ` : ""}the ${cases.length === 1 ? "fixture case that opens" : `${cases.length} fixture cases that open`} a page: ${list(cases)}.`,
    `Without a base, ${list(base)} are \`BLOCKED\`.`,
  ].join(" ");
}

/** The generated blocks each hand-written doc holds, by file from the repository root. */
export function renderBlocks(model: Model): Record<string, Record<string, string>> {
  return {
    "packages/harness/README.md": { scripts: renderReadmeTable(model) },
    "CLAUDE.md": { scripts: renderClaudeList(model) },
    ".claude/skills/verify/SKILL.md": { "no-chrome": renderNoChrome(model), blockers: renderBlockers(model) },
  };
}

/** The doc with each named block replaced, or a problem when a block's markers are missing or repeated. */
export function apply(text: string, blocks: Readonly<Record<string, string>>): { text: string } | { problem: string } {
  let result = text;
  for (const [name, body] of Object.entries(blocks)) {
    const start = `<!-- docs:gen ${name} start -->`;
    const end = `<!-- docs:gen ${name} end -->`;
    const from = result.indexOf(start);
    const to = result.indexOf(end);
    if (from === -1 || to === -1 || to < from || result.indexOf(start, from + 1) !== -1 || result.indexOf(end, to + 1) !== -1) {
      return { problem: `needs one ${start} and, after it, one ${end}.` };
    }
    result = `${result.slice(0, from + start.length)}\n${body}\n${result.slice(to)}`;
  }
  return { text: result };
}
