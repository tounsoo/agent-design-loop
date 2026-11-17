---
status: adopted
changes: []
---
# A local studio reads the checks' results as data

A local web app, the studio, will sit over the harness at `apps/studio`. A designer opens it to see each rule's result on each product, talk with an agent about a change, and file a proposal. None of it is built yet. This proposal records that decision and adopts the groundwork, which lands with it: the rule checks, `check:opt-outs` and `check:product` print their result as JSON with `--json`, and the root `package.json` lists `apps/*` among its workspaces so the studio has a place to land. No product's inputs, rules, catalog, layouts, page types, flows or config change, and no adapter field is added, so it lists no changes and is adopted at once.

Rule or input: none changes. Every check passes and fails exactly what it did before. With `--json`, a check prints one JSON document on stdout and nothing else: the check's npm script, the config, `pass` or `fail`, and each finding with the line the check prints for it and the location it knows, a file and line, a page, a scenario and its state, or a view. `check:product` adds one entry for each check it runs, in order, and marks a rule it skips for an opt-out as `skipped`, with the proposal, and one it never reached after a failure as `not-run`. The type is `CheckReport`, exported from `packages/harness`. Without the flag the output and the exit codes are the ones they were, and the exit code is the same with it.

## Reason

The studio has to show a designer which rule failed, where, and why. The checks already know that, but they print it as text for a person in a terminal, and a page that parsed those lines would break whenever one is reworded. A structured result, written by the same code that prints the text, gives the studio the same facts the build gate acts on.

The checks stay the only judge of whether a product is valid. The studio shows what they report and starts them; it does not decide pass or fail, and neither does any model it talks to. An agent in the studio can explain a finding or draft a proposal, and the code owner still decides the proposal, as `proposals/README.md` says.

One reporter in `packages/harness/src/lib/report.ts` carries every check's findings, so the format is one schema and a new check gets it by printing its findings through that reporter.

## Preview

`npm run lint:slots -- --config <config> --json` on a page with two primary buttons in its slot prints one line on stdout, `{"check":"lint:slots","config":"<config>","status":"fail","findings":[{"message":"<file>:<line>: primary slot accepts exactly one primary button, found 2 primary and 2 Button.Root.","file":"<file>","line":<line>}]}`, and exits 1, as the same command without `--json` does. The fixture case `illegal/two-primaries` runs it both ways.

## Adoption

Adopted in the pull request that adds `--json` to the rule checks, `check:opt-outs` and `check:product`, `packages/harness/src/lib/report.ts` with its tests, `CheckReport` in `packages/harness/index.ts`, and `apps/*` in the root `package.json`'s workspaces. The studio itself comes in later pull requests.
