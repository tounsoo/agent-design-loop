---
status: adopted
changes:
  - products/meridian/harness.config.ts
  - paths.source
  - paths.features
  - paths.layouts
  - paths.contentLayouts
  - paths.pageTypes
  - paths.catalog
  - paths.inputs
  - paths.rules
  - paths.styles
  - paths.app
  - paths.web
  - packages/adapter-todae/index.ts
---
# Proposal 0006: Move the harness, the Todae adapter and Meridian into their own folders

Decided, and graduated with its own pull request. Ben approved the split plan, and this is its step 7, "the move". It records config path changes that land with the move itself, so nothing graduates later.

Rule or input: every product's harness config and the adapter path it names. No product input, rule cap, catalog export, flow state or adapter field changes.

- Meridian's config moves from `harness.config.ts` to `products/meridian/harness.config.ts`. Every path in it moves from `src/...` to `products/meridian/...`. `paths.app` names `products/meridian/preview`, which was `src/harness/state-preview`. `paths.web` is `products/meridian`, where its `index.html` now lives.
- The Todae adapter moves from `adapters/todae.ts` to `packages/adapter-todae/index.ts`, and both products' `adapter` field names the new path. Its content does not change.
- The checks move from `scripts/` to `packages/harness/src/`, and the fixtures from `fixtures/` to `packages/harness/fixtures/`. The fixture product's config gets the same path prefix.

A check no longer falls back to a config at the repository root, because there is none. Each run names its product with `--config`.

`check:inventories` learns to read a product that moved. When the base has neither the head's config nor its inputs at their new paths, it asks git whether the inputs module was renamed, and compares with the base config whose `paths.inputs` was the old name. A move then shows as path changes in the config, with every membership compared to the base, instead of as a new product whose membership nobody compares.

## Reason

The harness is meant to be reusable by other products. With the checks in `scripts/`, Meridian in `src/` and Meridian's config at the root, the harness and one product were the same folder. A second product had to import the harness by a relative path into `scripts/`, and a reader could not tell which files belonged to which.

The rules stay where they were. Only the paths that say where each inventory lives change, and the inventory check compares each product with what it had before the move.

## Preview

Meridian's config after the move:

```ts
adapter: "packages/adapter-todae/index.ts",
paths: {
  source: "products/meridian",
  features: "products/meridian/features",
  // ...every other path under products/meridian
  app: ["products/meridian/preview", "products/meridian/App.tsx", "products/meridian/main.tsx"],
  web: "products/meridian",
},
```

Nook's config changes only its `adapter` line.

Every check prints what it printed on `6acd08f`, with the new paths. `check:inventories` reports the config path changes with this proposal, and no membership change, for both products.

## Adoption

- No file changes on approval. These change in the same pull request:
  - `products/meridian/` (from `src/`, `index.html`, `harness.config.ts` and `review/`) and `products/nook/harness.config.ts`.
  - `packages/harness/` (from `scripts/` and `fixtures/`), with `packages/harness/src/lib/parse-config.ts` split from `config.ts` so the fixture runner can parse configs without loading one.
  - `packages/adapter-todae/` (from `adapters/`).
  - `package.json` workspaces and scripts, `tsconfig.json`, `vite.config.ts`, `.github/workflows/ci.yml` and `CODEOWNERS`.
