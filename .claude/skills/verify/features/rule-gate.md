# The rule gate

The harness itself, the surface an agent meets. Rules and inventories live in the repo as data, checks fail the build, illegal fixtures prove each check can fail, and a proposal under `proposals/` is the only way an inventory grows. An agent reads exit codes and each check's verdict line.

## Sub-features

- `gate-checks` prints a verdict line for each check on success and names the problem on failure.
- `gate-fixtures` proves every case listed in `scripts/check-fixtures.ts` fails its check with the expected phrase.
- `gate-inventories` compares inventory membership with the pull request base and fails a change without a new proposal.

## How to get to it (user POV)

- Run `npm run check:fixtures && npm run check`, as `AGENTS.md` says.
- Run one check on its own, as `npm run check:<name>`.

## Driving it with the build gate and fixtures

Preconditions:

- The baseline preconditions hold, and `origin/main` (or a local `main`) is in the clone.

- **Fixtures.** Run `npm run check:fixtures`. One line per listed case reads `<case> failed the check as required (exit 1).`, then `fixtures: illegal cases failed the checks.`
- **One failing case.** Run `npx tsx scripts/check-slots.ts --root fixtures/illegal/two-primaries`. It exits 1 and names the primary slot.
- **Inventories.** Run `npm run check:inventories`. It prints `inventory: membership matches <base sha>.` and the current layouts, content layouts, page types, catalog count and flow states.

## Gotchas

- `check:inventories` uses `INVENTORY_BASE` when set (CI sets the pull request base, or the previous commit on a push to `main`). Otherwise it uses the merge base with `origin/main`, or with a local `main`.
- A new folder under `fixtures/illegal/` runs only once it has a row in `scripts/check-fixtures.ts`.
- There is no LLM judge. What the checks cannot decide goes in `review/` as a short note.
