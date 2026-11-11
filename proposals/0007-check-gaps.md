---
status: graduated
changes: []
---
# Proposal 0007: Close six gaps in the checks

Decided, and graduated with its own pull request. Ben asked for the six known gaps in the checks to be fixed in one pull request. This records how the rules read after that change, which lands with it, so nothing graduates later.

Rule or input: how six checks read the rules they already had. No product input, rule cap, catalog export, layout, content layout, page type, flow state or adapter field changes, and no product's `harness.config.ts` changes.

- **check:target-size** measures every control in the document, not only those inside the `[data-page]` element. The chrome around a page, and a state that renders no page, are held to the same 24 CSS px floor. Besides the page's own disclosure, every closed disclosure in the document, such as a menu in the chrome, is opened on its own and measured.
- **check:priority** holds its rules per page, in the page scope the disclosure caps use. A page has at most one primary button and shows the rank-2 action at most once. A primary is not inside a disclosure, including one in a component the page renders or one around the page shell. An action button whose variant is computed fails, because it could be a second primary. Across the product, at least one page holds the rank-1 primary, the rank-2 action is shown, and no primary or rank-2 button sits where no page reaches it. Before, the check counted primaries across the whole product, so a second product page with its own primary failed, and a second primary under an import alias passed.
- **The page scope** that check:priority, check:disclosure and check:one-thing share follows a component imported under another name, a default export, and `export *` in a barrel. Before, such a component was in no page, so the disclosure caps reported it unreached, and per-page priority would have too.
- **check:step-budget** names a flow state by its `status` field, as before, or by `flowStatus(state)` when the task graph module exports one. A state with neither fails. Before, such a graph measured nothing and passed.
- **lint:slots, check:one-thing and check:inventories** require every slot named in `shells.primarySlots` and `shells.collections` to be one the page type's shell defines, as `Object.assign(Root, { ... })`. Before, a misspelled slot matched no element and switched its rule off.
- **check:inventories** accepts a membership change only when one new proposal names it, alone or inside a path: the member added or removed, the constant, the task id with `max_steps`, the priority action with `priority`, the config field or its new value, `flows` with each string in it that changed, the new adapter path, `adapter.<field>` for an adapter field, or a new product's directory. Before, any new proposal with the words reason, preview and graduation let every change through.
- **lint:product-ui** reads re-exports, `import()`, `require()` (directly, as a property or through a comma) and `import x = require()` as imports, so the design system cannot be loaded outside the catalog by those routes. A dynamic load whose specifier is not a string literal fails, because it cannot be checked.

## Reason

Each gap let a rule go quiet without a failing build. A control in the chrome could be any size. A page type rendered twice made the priority rule fail a correct product, and an aliased button got past it. A flow without a `status` field passed the step budget unmeasured. A typo in the config switched a slot rule off. A proposal about one thing waved through another. And `export { Button } from "@tounsoo/todae"` put the design system outside the catalog with no error.

The fix is in the checks, not in a product. Meridian and Nook print what they printed before, apart from the new per-page wording of `check:priority`. The proposal rule would have refused proposal 0006 as written, because it names "every other path" instead of each one and does not name `flows`. That proposal has merged and is not edited. A future move names each path it changes.

## Preview

`check:priority` on Meridian:

```
priority: "Approve" is the primary button on 1 of 2 pages; "Request changes" is secondary; disclosed: "Line items".
```

`check:inventories` on a pull request that adds `side-panel` to `allowed_layouts` with a proposal about a toast:

```
inventory: set changed without a proposal that covers it. New proposals: proposals/0101-toast.md.
inventory: allowed_layouts changed from ["app-shell"] to ["app-shell","side-panel"]. No new proposal covers it: one proposal must name "side-panel", and none names "side-panel".
```

Each new rule has a legal and an illegal case under `packages/harness/fixtures/`, listed in the harness's [How this design loop works](../packages/harness/docs/how-it-works.md).

## Graduation

- No file changes on approval. These change in the same pull request:
  - `packages/harness/src/`: `check-target-size.ts`, `check-priority.ts`, `check-step-budget.ts`, `check-inventories.ts`, `lint-product-ui.ts`, `check-fixtures.ts`, and `lib/shells.ts`, `lib/page-scope.ts`, `lib/config.ts` and `lib/parse-config.ts`.
  - New cases under `packages/harness/fixtures/` and `packages/harness/fixtures/illegal/`.
  - `packages/harness/README.md`, `packages/harness/docs/how-it-works.md` and `proposals/README.md`.
