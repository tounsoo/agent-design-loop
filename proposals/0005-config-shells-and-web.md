# Proposal 0005: Name shell slots and the app root in the harness config

Status: decided. Ben approved the split plan, and this is its step 6, "second product". It records a harness config change that lands with the checks that read it, so nothing graduates later.

Rule or input: the harness config, `harness.config.ts`. It gains a `shells` block and `paths.web`. No product input, rule cap, catalog export or adapter name changes.

- `shells.primarySlots` maps a page type to the slot on its shell that holds the page's one primary action. Meridian's is `{ detail: "Primary" }`. `lint:slots` used to look for `DetailPage` and `DetailPage.Primary` by name.
- `shells.collections` maps each page type that is a collection to its shell's chrome slots. Meridian's is `{ collection: ["Heading", "Description"] }`. `check:inventories` used to look for `CollectionPage`, `CollectionPage.Heading` and `CollectionPage.Description` by name, and `check:one-thing` for the page type id `collection`.
- `paths.web` is the directory with the product's `index.html`, which `check:target-size` builds and serves. Meridian's is `.`. The script used to build whatever Vite found at the repository root.

The shell names themselves still come from each page type's module under `paths.pageTypes`, as before. Both `shells` fields are required. Every page type in `allowed_page_types` is named in exactly one of them, and a collection's pages fill at least one slot outside its chrome, so a rule cannot go quiet by leaving a page type out or by calling its body chrome.

It also records Nook, the second product under `products/nook`, as a new set of inventories. `check:inventories` now treats a product whose config and inputs the base has neither of as one membership change that needs a new proposal, and this file is Nook's.

## Reason

A second product, Nook under `products/nook`, has to pass the rules without editing them. Three checks still held Meridian's names. A product whose record page is `BookingPage` with its action in `BookingPage.Action`, and whose list is `RoomsPage`, had nowhere to say so: `lint:slots` failed it for not rendering a `DetailPage`, and the collection rules never read its list. `check:target-size` could only build Meridian's app.

The rules stay the harness's: one primary action in a primary slot, no primary action on a collection, a collection's ready body is a registered content layout. The config only says which page types those rules read and what their slots are called, which page types stay product-owned for. A page type a shells rule names must be in `allowed_page_types`, and a config that names no primary slot fails, so a rule cannot go quiet by naming nothing.

The block is under the same gate as the rest of the config. Moving the primary slot to another slot, or dropping a page type from `collections`, changes what the checks read.

## Preview

Meridian's config after the change:

```ts
paths: {
  // ...as before
  web: ".",
},
shells: {
  primarySlots: { detail: "Primary" },
  collections: { collection: ["Heading", "Description"] },
},
```

Nook's:

```ts
paths: {
  // ...products/nook paths
  web: "products/nook",
},
shells: {
  primarySlots: { booking: "Action" },
  collections: { rooms: ["Title", "Intro"] },
},
```

Meridian's results do not change. Every check prints what it printed on `e4339f0`, except `check:inventories`, which reports the config change with this proposal.

## Graduation

- No file changes on approval. These change in the same pull request:
  - `harness.config.ts`, `fixtures/product/harness.config.ts` and `scripts/lib/config.ts`, which parses the two fields.
  - `scripts/lib/shells.ts`, which reads shells from page-type modules and the rules from the config, and `scripts/lib/page-scope.ts`.
  - `scripts/check-slots.ts`, `scripts/check-one-thing.ts`, `scripts/check-inventories.ts` and `scripts/lib/collection-body.ts` read the shells rules.
  - `scripts/check-target-size.ts` builds `paths.web`, which must be inside the repository.
  - `scripts/lint-product-ui.ts` fails a relative import that reaches outside the product's own directories.
  - `products/nook/`, its CI job in `.github/workflows/ci.yml`, and `scripts/check-product.ts`.
