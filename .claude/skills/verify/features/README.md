# Meridian verification map

This directory is the maintained source for verifying what a person or an agent meets in this repository. Read the index before driving, then use the matching feature file as the recipe.

## Baseline preconditions

- `npm ci` has run with Node 22, and `git status --short` is empty.
- For a browser drive: `npm run build && npm run preview` serves Meridian at `http://127.0.0.1:4173/`. It is ready when Vite prints that URL. `npm run dev` serves it at `http://127.0.0.1:5173/` instead.
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

Each file has an H1 title, one paragraph on the user-visible behavior, then four H2 sections in order: `Sub-features` (short IDs), `How to get to it (user POV)`, `Driving it with <harness>` (starts with `Preconditions:`, then labeled bullets pairing an action with a command and its observable result) and `Gotchas`.

## Features

- [Payables collections](collections.md): To approve, All invoices and Vendors, with search and paging.
- [Approve an invoice](approve-invoice.md): the named task, two steps to `invoice-approved`.
- [Request changes](request-changes.md): the branch, with its required reason.
- [Scenarios](scenarios.md): `?scenario=` URLs and the Preview menu.
- [The rule gate](rule-gate.md): checks, illegal fixtures and proposals, the surface an agent meets.

When a feature is added or changes, update its file in the same pull request.
