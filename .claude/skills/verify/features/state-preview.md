# Modeled-state preview

A developer aid: `?state=` opens any modeled flow state without clicking through, and the header's Preview menu links to each. The shell stays up in every state, and loading, empty and error render inside `main`. A state the model doesn't name is ignored, and the page stays on To approve.

## Sub-features

- `preview-states` opens loading, empty, error, ready, invoice-approved and changes-requested.
- `preview-params` reads `page=`, `route=`, `branch=` and `invoice=`.
- `preview-unknown` ignores a state name the model doesn't have.
- `preview-coverage` keeps a view for every modeled state.

## How to get to it (user POV)

- Open the `Preview` menu in the header and choose a state.
- Open a URL from the README's state list, such as `?state=loading`, `?state=empty` or `?state=error`.

## Driving it with Vitest, the rule checks and a browser

Preconditions:

- The baseline preconditions hold.

- **States.** Open `?state=loading`, `?state=empty` and `?state=error`. Run `npx vitest run -t "renders loading, empty, and error"` and `npx vitest run -t "shows the load error with a secondary retry"`. They show `Loading invoices`, the heading `No invoices waiting`, and `Couldn't load invoices.` with a secondary `Try again`.
- **Parameters.** Run `npx vitest run -t "state preview harness"`. Both cases pass: a modeled state with a page, an unknown name ignored, a route and an invoice id.
- **Coverage.** Run `npm run check:state-coverage`. It prints `6 modeled states have views` and lists them.
- **Browser.** Run `CHROME_PATH=<chrome> npm run check:target-size`. It opens every URL in the README's state list and prints `invoice controls meet 24 CSS px`.

## Gotchas

- `check:target-size` keeps its own hand-written list of states, so a new modeled state needs a line there too.
