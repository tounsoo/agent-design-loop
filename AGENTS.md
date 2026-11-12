# Agent loop

This file is a pointer. The checks enforce the rules. Inventories are data. This file does not list what they contain. A walkthrough for people new to the repo is `packages/harness/docs/how-it-works.md`, and Meridian's own is `products/meridian/docs/how-it-works.md`.

Every product lives under `products/<name>/`, and its `harness.config.ts` names where its inventories live. The checks find each product by that file, so nothing else lists the products. Before changing a product's UI, read what its config names, in order:

1. Product inputs: `paths.inputs`
2. UX rules: `paths.rules`
3. Catalog, the only UI entry: `paths.catalog`
4. Layouts: `paths.layouts`
5. Content layouts: `paths.contentLayouts`
6. Page types: `paths.pageTypes`, with `shells` saying which kind each page type is: a page with a primary slot, a collection, or a content page
7. Flow model: each entry under `flows`
8. Proposals: `proposals/README.md`

For **Meridian**, an accounts-payable workspace, the config is `products/meridian/harness.config.ts`, and its inputs are `products/meridian/inputs/product.ts`. **Nook** is the second product, under `products/nook/`. The named task is in the product inputs. `npm run new:product -- <name>` starts a product from the harness's fixture product, which passes every check; the new product passes `check:inventories` once a proposal that lists `products/<name>` is decided on the base and adopted with it. The checks themselves live in `packages/harness/`; product code does not edit them.

Layouts are product-owned shells with named slots, encoded from Todae recipes. Recipes are copyable glue, not package namespaces. Do not invent component names or props. Do not fork [Todae](https://github.com/tounsoo/todae). Import UI only from the catalog.

Loop: follow the graph in `packages/harness/design-loop.ts` from its `start` node. Do what each node's label says and take the edge whose `when` matches the outcome. An eval node runs its scripts, and a human node waits for its gate's review. `npm run check:loop` keeps the graph valid. The diagram is in `packages/harness/docs/how-it-works.md`.

Trace: record the walk as you go. Each time you take a node, run `npm run loop:step -- traces/<change>.jsonl <node> [when]`, with the `when` of the edge you took out of a router, eval or human node. A change that touches a product needs a trace, and `npm run check:trace` fails one the graph does not allow. Run it before you push. The trace is a record for the reviewer, not a proof, so write only what you did.

States: before you build, list every state the screen will show, the edge cases included (empty, loading, error, long content, permissions, and what changes over time), and look for information the screen would show twice. A proposal writes them in its `## States` section, as `proposals/README.md` describes, and `check:proposals` fails one that changes or adds members without them.

Screenshots: at the loop's `screenshots` node, after the gate passes, run `npm run screenshots -- --config <product config> --out products/<name>/review/screenshots/<change> --base origin/main`, with `--state <state>` for each state the change touches, or no `--state` for every preview. Commit the folder with the gallery `README.md` it writes, run the `--pin` line it prints, which points each image's link at the raw PNG at that commit, commit the `README.md` again, and put the line `--pin` prints in the pull request description, with `<sha>` replaced by the pushed commit's full SHA and its whole `https://github.com/` address, never a relative path or a branch link, so each image opens full size from the gallery on any device.

Checks: `npm run check:fixtures && npm run check`

A pull request that adds or changes a check in `packages/harness/` also updates `CLAUDE.md` and the verify skill, `.claude/skills/verify/SKILL.md`, in the same pull request.

If the work needs a catalog export, layout, content layout, page type, flow state, or rule input that is not in those inventories, open a proposal, `status: open`, that lists under `changes` exactly what the inventory gains or loses, as `proposals/README.md` describes. Do not invent the missing piece, and do not edit an inventory to sneak the change through. The change itself waits for a later pull request, after the code owner has merged the proposal as `status: decided`; that pull request marks it `status: adopted`. The checks fail a proposal adopted in the pull request that adds it, with one exception: when the change only adds or only tightens, the proposal may list it under `adds` or `tightens`, with nothing under `changes`, `retires` or `opts-out`, and be adopted in the same pull request as the change. `adds` takes a new catalog export, layout, content layout or flow state by its bare name, `page-type:<id>` for a new page type with its own new `shells` entry, `task:<id>` and `preview:<state>?<query>`; `tightens` takes `max_steps:<task id>` lowered, a cap lowered, `TARGET_MIN_PX` raised and `disclosed_sections:<section>` added. The code owner merges that pull request. Removals, renames, loosened rule inputs, a changed `shells` entry, other config, opt-outs and retirements keep two pull requests ([proposal 2026-11-12-right-size-governance](proposals/2026-11-12-right-size-governance.md)).

Every harness rule applies to every product. If one should not apply to a product, the proposal is an opt-out, and taking a rule out of the harness is a proposal that retires it, as `proposals/README.md` describes. Do not skip or weaken the check.
