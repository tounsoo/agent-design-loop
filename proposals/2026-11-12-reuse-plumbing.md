---
status: adopted
changes: []
---
# One build per product, a product registry, content pages and a product scaffold

Decided by Ben on Nov 12, 2026, as item 8 of the plan from the harness eval ("Do all in ideal order"), and adopted with its own pull request. It changes how the harness runs and finds products, and adds a page kind a product may use. No product's inputs, rules, catalog, layouts, page types, flows or config change, so it lists no changes and is adopted at once.

Rule or input: how `check:product` serves the app, how the checks and CI find products, and a third, optional `shells` kind. `check:rules` does not change.

- **One build per product.** `check:product` builds the app in `paths.web` once, just before the first of `check:target-size` and `check:accessible-names`, serves it with `vite preview` on a free port, and gives both its address. Either check run alone, and `npm run screenshots`, builds and serves its own copy, also on a free port. No check uses port 4173 any more, so two runs at once no longer fight over it. `npm run preview` still serves Meridian there for a person to open.
- **A product registry.** A product is any `harness.config.ts` git knows of, tracked or new and not ignored, outside `packages/harness/`. `npm run check:products` runs `check:product` on each, and `check`, `check:proposals`, `check:retirement`, `check:trace` and CI read the same list. CI's `products` job prints it with `npm run check:products -- --json`, and a `product` job runs once per config. `check:meridian`, `check:nook` and CI's `nook` job are gone.
- **Content pages.** `shells.content`, optional, names page types that show information, such as a help or policy page. No page of a content page type holds a primary button, outside the chrome layouts every page shares, and a page type sits in exactly one of `shells.primarySlots`, `shells.collections` and `shells.content`.
- **A product scaffold.** `npm run new:product -- <name>` copies the fixture product, which now builds, serves and passes both Chrome checks like a product, to `products/<name>/` and points its paths there.

## Reason

The eval found that adding a product meant five edits outside the product (a script, the `check` chain, a CI job, the retirement list and the docs), that the Chrome checks each built the app again and collided on port 4173 when two ran at once, and that a page with no primary action had to be a collection, whose body rules do not fit a page of text. A harness that other products reuse should find a product by its config, build its app once, and let a product say what kind of page it has.

## Preview

`npm run check:product -- --config products/meridian/harness.config.ts`, before the Chrome checks:

```text
check:product: building products/meridian once for the checks that open it in Chrome.
check:product: serving it at http://127.0.0.1:<free port>/
```

`check:one-thing` on `illegal/primary-on-content-page`:

```text
one thing: …/Steps.tsx:8 puts a primary button on the HelpPage content page. A content page shows information; an action that needs a primary button belongs on a page type with a primary slot.
```

## Adoption

`packages/harness/src/lib/served-app.ts` builds into a temporary folder and serves on a free port, and `check-product.ts` shares one build with the Chrome checks through `HARNESS_APP_URL` and `HARNESS_APP_WEB`. `src/lib/products.ts` is the registry, read by the new `check-products.ts`, by `check-proposals.ts`, `check-retirement.ts` and `check-trace.ts`, and by `.github/workflows/ci.yml`. `parse-config.ts`, `shells.ts`, `page-scope.ts`, `check-one-thing.ts` and `check-inventories.ts` read `shells.content`. `src/new-product.ts` is the scaffold. The fixture product gets an `index.html` and `main.tsx`, and its case runs both Chrome checks. New fixtures: `content-page` passes, and `illegal/primary-on-content-page`, `illegal/computed-variant-on-content-page`, `illegal/page-type-in-primary-and-content` and `illegal/content-rule-unknown-page-type` fail. `CLAUDE.md`, `AGENTS.md`, the verify skill, `proposals/README.md`, Meridian's README, the harness README and `how-it-works.md` describe the registry, the shared build, content pages and the scaffold.
