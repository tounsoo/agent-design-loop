---
status: graduated
changes: []
---
# Proposal 0008: Harness rules apply to every product, with opt-out by proposal and retirement

Decided, and graduated with its own pull request. Ben decided on Nov 11 that an approved pattern graduates straight into the shared harness, not into one product first, with two guards: a product opts out of a rule only by proposal, and a rule most products opt out of gets flagged for retirement. This records that change, which lands with its own pull request, so nothing graduates later.

Rule or input: the harness config gains two optional fields, `optOuts` and `paths.proposals`. Neither product's config changes. No product input, rule cap, catalog export, flow state or adapter field changes. Two checks are added, `check:opt-outs` and `check:retirement`, and `check:product` learns to skip a rule a product opts out of.

## Reason

Agents design best from one shared set of rules. If a pattern lived in one product first and moved to the harness later, two products would follow different rules for the same thing, and nothing would say when to move it.

Graduating straight into the harness has its own risk. One product's quirk becomes every product's rule, and rules only pile up. The two guards answer that.

- **Opt-out by proposal.** A new harness rule applies to every product. A product turns a rule off in its `harness.config.ts` only by naming a decided proposal that says why. Without one, `check:opt-outs` fails, and `check:product` runs it before any rule check.
- **Retirement.** `check:retirement` reads every product's config, and checks each one's opt-outs too, so a product no npm script runs cannot carry an unbacked one. When a majority of products, and at least two, opt out of the same rule, it fails and names the rule. A rule most products turn off is not a shared rule. The fix is a proposal that takes it out of `check:rules`, or withdrawing an opt-out.

Two rules cannot be opted out: `lint:product-ui`, the rule that UI comes only from the catalog, and `check:inventories`, which is what makes a proposal necessary at all.

## Preview

A product that opts out of `check:disclosure` adds one line to its config:

```ts
optOuts: {
  "check:disclosure": "proposals/0103-nook-has-no-disclosure.md",
},
```

and the proposal it names lists the opt-out in its front matter, besides its reason, preview and graduation:

```md
---
status: graduated
changes: []
opts-out:
  - check:disclosure for products/nook
---
```

This example used `Status:` and `Opts out:` lines when it merged. [Proposal 0011](0011-proposal-fields-and-graduation.md) replaced them with these fields, and made an opt-out name a graduated proposal, not a decided one. `0103` is a made-up number, like the `0102` example in the [proposals README](README.md); the real proposal 0009 is the design loop graph.

`check:product` then prints `check:product: skipped check:disclosure, which this product opts out of in proposals/0103-nook-has-no-disclosure.md.` and runs every other rule.

If Meridian later opts out of `check:disclosure` too, both products of two have opted out, and `check:retirement` fails with `check:disclosure: opted out by 2 of 2 products (products/meridian, products/nook).`

The pattern lifecycle the docs now describe:

1. Proposed. A proposal asks for a new rule.
2. Approved. A designer approves it. CODEOWNERS asks for review on `proposals/` and now on `packages/harness/`.
3. Graduated. The rule becomes a check in `check:rules`, and it applies to every product.
4. Opted out. A product that should not follow it writes a decided proposal and names it in `optOuts`.
5. Retired. When a majority of products opt out, `check:retirement` flags it, and a decided proposal takes it out of `check:rules`.

## Graduation

No file changes later. These change in the same pull request:

- `packages/harness/src/lib/parse-config.ts` reads `optOuts` and `paths.proposals`, which defaults to `proposals`.
- `packages/harness/src/lib/opt-outs.ts` holds the core rules, the opt-out rules and the retirement threshold.
- `packages/harness/src/check-opt-outs.ts` and `packages/harness/src/check-retirement.ts` are the new checks. `package.json` names them, and `check` runs `check:retirement` after both products.
- `packages/harness/src/check-product.ts` runs `check:opt-outs` first and skips opted-out rules.
- `packages/harness/src/check-fixtures.ts` lets a case set `optOuts`. New cases are `opt-out` and six under `illegal/opt-out-*`.
- `.github/workflows/ci.yml` runs `check:retirement` in the `check` job.
- `CODEOWNERS` asks for review on `packages/harness/`, where a rule graduates, and on `package.json`, where `check:rules` lists the rules.
- The docs: `proposals/README.md`, the harness README, `packages/harness/docs/how-it-works.md`, `AGENTS.md`, the root README and `CLAUDE.md`.
