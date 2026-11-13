# Verification map

This directory is the maintained source for verifying what a person or an agent meets in this repository: one folder per product, each with its own index and a feature file for each part of the product, and the rule gate beside them. Read this index before driving, then the product's index, then use the matching feature file as the recipe.

## Baseline preconditions

- `npm ci` has run with Node 22, and `git status --short` is empty.
- For a browser drive: the product's index says how to serve it. Meridian's `npm run build && npm run preview` is ready at `http://127.0.0.1:4173/` when Vite prints that URL, and `npm run dev` or `npm run dev:nook` serves at `http://127.0.0.1:5173/`.
- Never drive a dev or preview server that this verification run didn't start.

## Driving conventions

- Start every recipe from the default URL unless its preconditions say otherwise. The sample data resets on reload.
- Prefer ARIA roles and accessible names: they are what the Vitest journeys select by.
- Treat every command and quoted name as literal.
- A journey's `npx vitest run -t "<name>"` drives the same path in jsdom when no browser is available.

## Proof and skip reporting

- Capture the action and the resulting state: the heading, status or alert that appears, or the check's exit code and message.
- Record the feature ID and entry point used with every result.
- Report a path that couldn't run (no Chrome, for example) with the attempted command and the unmet precondition. Never report it as verified through a different path.

## Feature entry contract

Each file has an H1 title, one paragraph on the user-visible behavior, then five H2 sections in order: `Sub-features` (short IDs), `How to get to it (user POV)`, `Driving it with <harness>` (starts with `Preconditions:`, then labeled bullets pairing an action with a command and its observable result), `Gotchas` and `Covers`.

`Covers` names, in code spans, what the file drives, one kind to a line: `- Page types:`, `- Layouts:`, `- Content layouts:`, `- Tasks:` and `- Scenarios:`, a scenario written as the URL that opens it, such as `` `?scenario=vendor-helios-freight` ``. Leave out a kind the file doesn't drive. `npm run check:docs` holds the map to the product registry both ways: it fails while any page type, layout, content layout, task or scenario of a product is in none of its feature files, while a `Covers` line names one the product doesn't have, while a `?scenario=` URL in a product's folder opens no scenario of that product, while a product has no folder here or a folder's index misses one of its files, and while a page sits below a product's folder or at the top of the map without a link from this index. So a pull request that adds a page, a block or a scenario adds its recipe here in the same pull request.

## Products

One folder per product the registry finds, named after the product's own folder. `npm run docs:gen` writes this list from each product's config:

<!-- docs:gen products start -->
- [meridian](meridian/README.md), from `products/meridian/harness.config.ts`: 3 page types, 1 layout, 7 content layouts, 1 task and 16 scenarios.
- [nook](nook/README.md), from `products/nook/harness.config.ts`: 2 page types, 1 layout, 4 content layouts, 2 tasks and 13 scenarios.
<!-- docs:gen products end -->

## The harness

- [The rule gate](rule-gate.md): checks, illegal fixtures and proposals, the surface an agent meets.

When a feature is added or changes, update its file in the same pull request.
