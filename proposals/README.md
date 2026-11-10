# Proposals

A proposal is how a rule changes. The agent writes one when a check blocks work that should still happen. It does not edit the catalog, the page types, the flow, or `src/inputs/product.ts` to sneak the exception through.

Each proposal includes:

- the rule or input it wants to change
- a reason
- a preview of the UI or the path after the change
- the graduation: which file would change on approval

`CODEOWNERS` requests review for everything under `proposals/`. Merging the proposal file records the request. It does not apply the change. After approval, a separate change graduates it into the catalog, the page-type shell, the flow model, or the product inputs. The next run is constrained by that.

Open proposals are not shipped behavior.
