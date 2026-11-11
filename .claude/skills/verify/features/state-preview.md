# Modeled-state preview

A developer aid: `?state=` opens any modeled flow state without clicking through, and the header's **Preview** menu links to each. The shell stays up in every state; loading, empty and error render inside `main`.

## Sub-features

- `?state=` with `page=`, `route=`, `branch=` and `invoice=`.
- A state the model does not name is ignored, and the page stays on To approve.

## How to get to it (user POV)

Open the **Preview** menu in the header, or a URL such as `?state=loading`, `?state=empty`, `?state=error`, `?state=ready&page=detail&branch=request`.

## Driving it with Vitest and target size

- Vitest: `src/harness/state-preview/readState.test.ts`; "renders loading, empty, and error" and the load-error retry in `InvoiceApproval.test.tsx`.
- Checks: `check:state-coverage` fails a modeled state with no view; `typecheck` fails a non-exhaustive view.
- Browser: `check:target-size` walks every URL in the README's state list.

## Gotchas

- The list of states in `scripts/check-target-size.ts` is written out by hand, so a new modeled state needs a line there too.
