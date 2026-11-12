import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Inventory membership changes only by adopting a proposal, and each inventory's folders, barrels and uses match its list.",
  flags: [
    { name: "--base", value: "<file>", what: "Compares with the product that config names in the working tree, instead of the pull request base. The fixtures have no history of their own, so this is how they test membership. The config itself is not compared then." },
    { name: "--proposals", value: "<dir>", what: "Needs `--base`. Reads that folder as the change's proposals." },
    { name: "--base-proposals", value: "<dir>", what: "Needs `--base`. Reads that folder as the base's proposals, matched with `--proposals` by file name." },
  ],
  fails: [
    "A chrome layout, content layout or page type outside its allowlist, a directory under `paths.layouts`, `paths.contentLayouts` or `paths.pageTypes` with no list entry, or a list entry with no directory, and any other file directly in those directories besides `index.ts`.",
    "An import of a layout, content layout or page type under `paths.source` that is not on its list, a `pageTypes` export that does not match `allowed_page_types`, and a page-type barrel that re-exports an id not on it.",
    "A collection's ready body that is not one registered content layout, or that the feature passes ad-hoc children into.",
    "Page CSS for a class the feature uses that no content layout, chrome layout or page type uses.",
    "A membership change against the base that no adopted proposal covers. A proposal covers a change when it is `status: decided` on the base, `status: adopted` in the change, and its `changes` on the base list, exactly, what changed: the member added or removed, the constant, the config field or its new value, each changed string in `flows`, `adapter.<field>` for an adapter field, the new adapter path, or the product's directory.",
    "A proposal the change adds, used to cover anything but additions. A change that only adds members to the catalog exports, `allowed_layouts`, `allowed_content_layouts` or the flow states passes with a proposal the change adds as `status: adopted` that lists them under `adds` and nothing else. It covers nothing when it is on the base, when a base proposal already lists one of its `adds` under `adds`, or when one of its `adds` is a name the change removes or changes otherwise.",
    "A new page type adopted in one pull request: it also needs an entry under `shells` in the config, so a decided proposal lists the page type and its `shells` rule under `changes`.",
    "A base file with `export *` or `export =` that does not export a list by name, so a re-export cannot pass for a missing list.",
    "A config the base does not have at that path while the base has the product's inputs, so a renamed config needs a proposal.",
  ],
  details: [
    "Compared values: `allowed_layouts`, `allowed_content_layouts` and `disclosed_sections` once the base exports them; `allowed_page_types`; the catalog's export names; `modeledStates`; each task's `max_steps`; each priority item's action, rank and level; the caps and `TARGET_MIN_PX` in the rules module; every path in the config, its `flows` and `shells`; and the design system adapter, field by field, once the base config names one. String lists are sorted and de-duplicated first, so reordering is not a change. Names are compared, not values behind them, so pointing an existing name at another component is not a change.",
    "A list the base does not export yet may be recorded once, without a proposal: `allowed_layouts`, `allowed_content_layouts` or `disclosed_sections`, and the design system adapter the config names. A base exports a list when it declares it with `export const` or names a local `const` in an export clause.",
    "A product the base has neither the config nor the inputs of is moved or new. When git sees the inputs module renamed, the check compares with the base config whose `paths.inputs` named the old file, so a move shows as config path changes. A product with no such rename is new, a whole inventory added at once, which needs an adopted proposal that lists the product's directory.",
    "Proposals are read from the config's `paths.proposals` folder, `proposals/` by default, at the base and in the change, matched by file name. [When a proposal is required](how-it-works.md#when-a-proposal-is-required) walks the rule, and [proposal 0012](../../../proposals/0012-additions-in-one-pull-request.md) and [proposal 2026-11-12-page-types-take-two-pull-requests](../../../proposals/2026-11-12-page-types-take-two-pull-requests.md) record the exceptions. A product cannot opt out of this rule.",
  ],
} satisfies CheckMeta;
