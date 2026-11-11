# The rule gate

The harness itself, the surface an agent meets. The rules live in `src/rules/ux-rules.ts` and `src/inputs/product.ts`; the inventories are the catalog, layouts, content layouts, page types and flow states. Checks under `scripts/` fail the build, illegal fixtures prove each check can fail, and a proposal under `proposals/` is the only way an inventory grows.

## Sub-features

- Each check prints one line on success and names the problem on failure.
- `check:fixtures`: every illegal case fails its check with the expected phrase.
- `check:inventories`: membership versus the pull request base; a change without a new proposal fails.

## How to get to it (user POV)

An agent changes UI, runs `npm run check:fixtures && npm run check`, and reads exit codes and messages.

## Driving it with the build gate and fixtures

- `npm run check:fixtures` lists the nine cases in `fixtures/illegal/` and their result.
- `npm run check:inventories` prints `membership matches <sha>` and the current inventories.
- To see a check fail, run it with the fixture's arguments from `scripts/check-fixtures.ts`, for example `npx tsx scripts/check-slots.ts --root fixtures/illegal/two-primaries`.

## Gotchas

- `check:inventories` needs the base commit in the clone. CI passes `INVENTORY_BASE`; locally it uses the merge base with `origin/main`.
- There is no LLM judge. What the checks cannot decide goes in `review/` as a short note.
