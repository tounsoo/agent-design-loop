import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBaseRev, tryGit } from "./lib/base";
import { optOutProblems, retirementCandidates, RETIREMENT_MIN_PRODUCTS, unadoptedOptOuts, unretiredRemovals, type OptOutProduct } from "./lib/opt-outs";
import { DEFAULT_PROPOSALS, parseConfig } from "./lib/parse-config";
import { adopting, parseAll, proposalsAtRev, proposalsInDir, type Proposal } from "./lib/proposals";
import { ruleChecks } from "./lib/scripts";

/**
 * Reads every product's harness config in the repository and fails when a
 * rule is opted out of by a majority of products, and by at least two. A rule
 * most products turn off is not a shared rule: retire it with a proposal that
 * takes it out of `check:rules`, or withdraw an opt-out. A product is any
 * `harness.config.ts` git knows of, tracked or new, outside the harness
 * package, whose fixtures are not products. A tracked config deleted from the
 * working tree is no longer a product.
 *
 * It also checks every product's opt-outs the way check:opt-outs does, so a
 * product that no `check:<name>` script runs cannot carry an opt-out with no
 * adopted proposal behind it.
 *
 * Against the pull request base, read as check:inventories reads it, it
 * fails a rule taken out of `check:rules` unless a proposal this change
 * adopts lists it under `retires`, and an opt-out the base's config does
 * not have unless it names a proposal this change adopts. Adopting
 * means decided on the base and marked adopted here.
 */

if (process.argv.length > 2) {
  console.error("check:retirement takes no arguments. It reads every product's harness.config.ts.");
  process.exit(1);
}

const harnessDir = path.relative(process.cwd(), path.dirname(path.dirname(fileURLToPath(import.meta.url)))).split(path.sep).join("/");

function productConfigs(): string[] {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
  const files = output
    .split("\n")
    .filter((file) => path.posix.basename(file) === "harness.config.ts" && !file.startsWith(`${harnessDir}/`) && existsSync(file));
  return [...new Set(files)].sort();
}

const files = productConfigs();
if (files.length === 0) {
  console.error("retirement: found no harness.config.ts outside the harness package.");
  process.exit(1);
}

const products: OptOutProduct[] = files.map((file) => {
  const parsed = parseConfig(readFileSync(file, "utf8"), file);
  return { source: parsed.paths.source, proposals: parsed.paths.proposals, optOuts: parsed.optOuts };
});
const bySource = new Map<string, string[]>();
files.forEach((file, index) => {
  const source = products[index]?.source ?? "";
  bySource.set(source, [...(bySource.get(source) ?? []), file]);
});
const shared = [...bySource.entries()].filter(([, configs]) => configs.length > 1);
if (shared.length > 0) {
  for (const [source, configs] of shared) console.error(`retirement: ${configs.join(" and ")} both name paths.source ${source}, so that product would count twice.`);
  process.exit(1);
}

const rules = ruleChecks();
const read = (file: string): string | null => (existsSync(path.resolve(file)) ? readFileSync(path.resolve(file), "utf8") : null);
const invalid = files.flatMap((file, index) => {
  const product = products[index];
  return product ? optOutProblems(product, rules, read).map((problem) => `${file} ${problem}`) : [];
});
if (invalid.length > 0) {
  console.error("retirement: these opt-outs have no adopted proposal behind them, so they are not counted:");
  for (const problem of invalid) console.error(`- ${problem}`);
  process.exit(1);
}

const resolved = resolveBaseRev("retirement");
if ("problem" in resolved) {
  console.error(resolved.problem);
  process.exit(1);
}
const rev = resolved.rev;

// A retirement belongs to no one product, so proposals/ is read even when every product keeps its proposals elsewhere, as check:proposals does.
const proposalDirs = [
  ...new Set([DEFAULT_PROPOSALS, ...products.map((product) => product.proposals)].map((dir) => path.posix.normalize(dir).replace(/\/+$/, ""))),
].sort();
const adopts: Proposal[] = proposalDirs.flatMap((dir) =>
  adopting(parseAll(proposalsAtRev(rev, dir), { base: true }).proposals, parseAll(proposalsInDir(dir)).proposals),
);

function baseScripts(): Record<string, string> | null {
  const text = tryGit(["show", `${rev}:package.json`]);
  if (text === null) return null;
  return (JSON.parse(text) as { scripts?: Record<string, string> }).scripts ?? {};
}

const before = baseScripts();
const baseRules = before !== null && before["check:rules"] !== undefined ? ruleChecks("check:rules", new Set(), before) : [];
const unadopted = [
  ...unretiredRemovals(baseRules, rules, adopts),
  ...files.flatMap((file, index) => {
    const product = products[index];
    if (!product) return [];
    const text = tryGit(["show", `${rev}:${file}`]);
    const baseOptOuts = text === null ? null : parseConfig(text, `${rev.slice(0, 7)}:${file}`).optOuts;
    return unadoptedOptOuts(product, baseOptOuts, adopts).map((problem) => `${file} ${problem}`);
  }),
];
if (unadopted.length > 0) {
  console.error(`retirement: compared with ${rev.slice(0, 7)}, these rule changes adopt no decided proposal:`);
  for (const problem of unadopted) console.error(`- ${problem}`);
  process.exit(1);
}
const retired = baseRules.filter((rule) => !rules.includes(rule));
if (retired.length > 0) console.log(`retirement: ${retired.join(", ")} retired by ${adopts.map((proposal) => proposal.file).join(", ")}.`);

const candidates = retirementCandidates(products);

if (candidates.length > 0) {
  console.error("retirement: these rules are opted out of by most products, so they are flagged for retirement:");
  for (const candidate of candidates) {
    console.error(`- ${candidate.rule}: opted out by ${candidate.products.length} of ${candidate.of} products (${candidate.products.join(", ")}).`);
  }
  console.error("Retire a rule by adopting a decided proposal that lists it under retires and takes it out of check:rules, or withdraw an opt-out.");
  process.exit(1);
}

const optedOut = products.reduce((total, product) => total + Object.keys(product.optOuts).length, 0);
console.log(
  `retirement: no rule is opted out by a majority of ${products.length} products (at least ${RETIREMENT_MIN_PRODUCTS}); ${optedOut} opt-outs in all.`,
);
