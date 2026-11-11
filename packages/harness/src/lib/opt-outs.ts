import path from "node:path";

/**
 * A harness rule applies to every product. A product turns one off only with
 * an opt-out: the rule's name in its config's `optOuts`, pointing at a decided
 * proposal that says why. When most products opt out of the same rule, the
 * rule is a candidate for retirement, so the harness can shrink as well as
 * grow.
 */

/**
 * Rules no product may opt out of. Off-catalog UI is the loop's first rule,
 * and the inventory check is what makes a proposal necessary at all.
 */
export const CORE_RULES: readonly string[] = ["lint:product-ui", "check:inventories"];

/** A rule is flagged for retirement when at least this many products opt out of it, and they are a majority. */
export const RETIREMENT_MIN_PRODUCTS = 2;

export type OptOutProduct = {
  /** The product's `paths.source`, which its opt-out proposals name. */
  readonly source: string;
  readonly proposals: string;
  readonly optOuts: { readonly [rule: string]: string };
};

const OPTS_OUT = /^Opts out: `([^`]+)` for `([^`]+)`\.?[ \t]*$/gm;

const FENCED = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;

function withoutExamples(text: string): string {
  return text.replace(FENCED, "");
}

/**
 * The rule and product pairs a proposal's `Opts out:` lines name. A line in a
 * fenced code block is an example, not an opt-out, so a proposal that shows
 * the format cannot be borrowed as one.
 */
export function optOutLines(text: string): { rule: string; source: string }[] {
  return [...withoutExamples(text).matchAll(OPTS_OUT)].map((match) => ({ rule: match[1] ?? "", source: match[2] ?? "" }));
}

/**
 * What is wrong with a product's opt-outs. `rules` is the list `check:rules`
 * runs. `read` returns a proposal's text, or null when the file is missing.
 */
export function optOutProblems(product: OptOutProduct, rules: readonly string[], read: (file: string) => string | null): string[] {
  const problems: string[] = [];
  const dir = path.posix.normalize(product.proposals).replace(/\/+$/, "");
  for (const [rule, proposal] of Object.entries(product.optOuts)) {
    const where = `optOuts["${rule}"]`;
    if (CORE_RULES.includes(rule)) {
      problems.push(`${where}: ${rule} cannot be opted out. Core rules are ${CORE_RULES.join(", ")}.`);
      continue;
    }
    if (!rules.includes(rule)) {
      problems.push(`${where}: ${rule} is not a rule in check:rules. The rules are ${rules.join(", ")}.`);
      continue;
    }
    const file = path.posix.normalize(proposal);
    if (path.posix.dirname(file) !== dir || !file.endsWith(".md") || path.posix.basename(file) === "README.md") {
      problems.push(`${where}: ${proposal} is not a proposal file directly in ${dir}/.`);
      continue;
    }
    const text = read(file);
    if (text === null) {
      problems.push(`${where}: ${proposal} does not exist.`);
      continue;
    }
    if (!/^Status: decided\b/m.test(withoutExamples(text))) {
      problems.push(`${where}: ${proposal} is not decided. An opt-out applies now, so its proposal needs "Status: decided".`);
    }
    if (!optOutLines(text).some((line) => line.rule === rule && line.source === product.source)) {
      problems.push(`${where}: ${proposal} does not opt out ${rule} for ${product.source}. Add the line: Opts out: \`${rule}\` for \`${product.source}\``);
    }
    const lower = text.toLowerCase();
    const missing = ["reason", "preview", "graduation"].filter((word) => !lower.includes(word));
    if (missing.length > 0) problems.push(`${where}: ${proposal} has no ${missing.join(", ")}.`);
  }
  return problems;
}

export type RetirementCandidate = { rule: string; products: string[]; of: number };

/**
 * Rules opted out of by a majority of products, and by at least
 * RETIREMENT_MIN_PRODUCTS of them. With two products, both must opt out.
 */
export function retirementCandidates(products: readonly OptOutProduct[]): RetirementCandidate[] {
  const byRule = new Map<string, string[]>();
  for (const product of products) {
    for (const rule of Object.keys(product.optOuts)) byRule.set(rule, [...(byRule.get(rule) ?? []), product.source]);
  }
  return [...byRule.entries()]
    .filter(([, sources]) => sources.length >= RETIREMENT_MIN_PRODUCTS && sources.length * 2 > products.length)
    .map(([rule, sources]) => ({ rule, products: [...sources].sort(), of: products.length }))
    .sort((a, b) => a.rule.localeCompare(b.rule));
}
