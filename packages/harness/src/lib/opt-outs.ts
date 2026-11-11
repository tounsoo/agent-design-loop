import path from "node:path";
import { parseProposal, type Proposal } from "./proposals";

/**
 * A harness rule applies to every product. A product turns one off only with
 * an opt-out: the rule's name in its config's `optOuts`, pointing at an adopted
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
    const parsed = parseProposal(file, text);
    if (parsed.proposal === null) {
      problems.push(...parsed.problems.map((problem) => `${where}: ${proposal} ${problem}`));
      continue;
    }
    if (parsed.proposal.status !== "adopted") {
      problems.push(
        `${where}: ${proposal} is ${parsed.proposal.status}, not adopted. An opt-out applies now, so the change that adds it marks its decided proposal "status: adopted".`,
      );
    }
    if (!parsed.proposal.optsOut.some((line) => line.rule === rule && line.source === product.source)) {
      problems.push(`${where}: ${proposal} does not opt out ${rule} for ${product.source}. Add it under opts-out: "  - ${rule} for ${product.source}"`);
    }
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

/**
 * Rules the base's `check:rules` ran that the head's does not. Each must be
 * retired by a proposal this change adopts whose `retires` lists it, so a
 * rule leaves the harness only on a designer's decision.
 */
export function unretiredRemovals(baseRules: readonly string[], headRules: readonly string[], adopts: readonly Proposal[]): string[] {
  return [...new Set(baseRules)]
    .filter((rule) => !headRules.includes(rule))
    .filter((rule) => !adopts.some((proposal) => proposal.retires.includes(rule)))
    .map(
      (rule) =>
        `${rule} left check:rules without a proposal that retires it. Retire a rule by adopting a proposal, decided on the base, that lists it under retires.`,
    );
}

/**
 * Opt-outs the head's config has that the base's does not, or that now name
 * another proposal. Each must name a proposal this change adopts, whose
 * `opts-out`, as the base has it, lists that rule for this product.
 */
export function unadoptedOptOuts(
  product: OptOutProduct,
  baseOptOuts: { readonly [rule: string]: string } | null,
  adopts: readonly Proposal[],
): string[] {
  const problems: string[] = [];
  for (const [rule, proposal] of Object.entries(product.optOuts)) {
    if (baseOptOuts?.[rule] === proposal) continue;
    const file = path.posix.normalize(proposal);
    const adopt = adopts.find((candidate) => path.posix.normalize(candidate.file) === file);
    if (adopt === undefined) {
      problems.push(
        `optOuts["${rule}"] is new, and ${proposal} is not adopted in this change. An opt-out adopts a proposal that is decided on the base: this change marks it "status: adopted".`,
      );
    } else if (!adopt.optsOut.some((entry) => entry.rule === rule && entry.source === product.source)) {
      problems.push(`optOuts["${rule}"] is new, and ${proposal} did not opt out ${rule} for ${product.source} when it was decided.`);
    }
  }
  return problems;
}
