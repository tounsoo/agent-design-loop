# Agent loop

This file is a pointer. The checks enforce the rules. Inventories are data. This file does not list what they contain. A walkthrough for people new to the repo is `packages/harness/docs/how-it-works.md`, and Meridian's own is `products/meridian/docs/how-it-works.md`.

Each product's `harness.config.ts` names where its inventories live. For **Meridian**, an accounts-payable workspace, that is `products/meridian/harness.config.ts`. Read, in order:

1. Product inputs: `products/meridian/inputs/product.ts`
2. UX rules: `products/meridian/rules/ux-rules.ts`
3. Catalog, the only UI entry: `products/meridian/catalog/index.ts`
4. Layouts: `products/meridian/layouts`
5. Content layouts: `products/meridian/content-layouts`
6. Page types: `products/meridian/page-types`
7. Flow model: `products/meridian/flows/invoice-approval`
8. Proposals: `proposals/README.md`

The named task is in the product inputs. A second product, **Nook**, lives under `products/nook/` with its own `products/nook/harness.config.ts`, which lists its inventories the same way; work on Nook reads those. The checks themselves live in `packages/harness/`; product code does not edit them.

Layouts are product-owned shells with named slots, encoded from Todae recipes. Recipes are copyable glue, not package namespaces. Do not invent component names or props. Do not fork [Todae](https://github.com/tounsoo/todae). Import UI only from the catalog.

Loop: follow the graph in `packages/harness/design-loop.ts` from its `start` node. Do what each node's label says and take the edge whose `when` matches the outcome. An eval node runs its scripts, and a human node waits for its gate's review. `npm run check:loop` keeps the graph valid. The diagram is in `packages/harness/docs/how-it-works.md`.

Trace: record the walk as you go. Each time you take a node, run `npm run loop:step -- traces/<change>.jsonl <node> [when]`, with the `when` of the edge you took out of a router, eval or human node. A change that touches a product needs a trace, and `npm run check:trace` fails one the graph does not allow. Run it before you push. The trace is a record for the reviewer, not a proof, so write only what you did.

Screenshots: at the loop's `screenshots` node, after the gate passes, run `npm run screenshots -- --config <product config> --out products/<name>/review/screenshots/<change> --base origin/main`, with `--state <state>` for each state the change touches, or no `--state` for every preview. Commit the folder with the gallery `README.md` it writes, and put the line it prints in the pull request description, with `<sha>` replaced by the pushed commit's full SHA and its whole `https://github.com/` address, never a relative path or a branch link, so each image opens full size from the gallery on any device.

Checks: `npm run check:fixtures && npm run check`

A pull request that adds or changes a check in `packages/harness/` also updates `CLAUDE.md` and the verify skill, `.claude/skills/verify/SKILL.md`, in the same pull request.

If the work needs a catalog export, layout, content layout, page type, flow state, or rule input that is not in those inventories, open a proposal, `status: open`, that lists under `changes` exactly what the inventory gains or loses, as `proposals/README.md` describes. Do not invent the missing piece, and do not edit an inventory to sneak the change through. The change itself waits for a later pull request, after a designer has moved the proposal to `status: decided`; that pull request marks it `status: graduated`. The checks fail a proposal that graduates in the pull request that adds it, with one exception: when the change only adds members to the catalog exports, `allowed_layouts`, `allowed_content_layouts`, `allowed_page_types` or the flow states, the proposal may list them under `adds`, with nothing else, and graduate in the same pull request as the change. A designer reviews that pull request. Removals, renames, rule inputs, config, opt-outs and retirements keep two pull requests.

Every harness rule applies to every product. If one should not apply to a product, the proposal is an opt-out, and taking a rule out of the harness is a proposal that retires it, as `proposals/README.md` describes. Do not skip or weaken the check.
