---
status: graduated
changes: []
---
# Proposal 0010: Proposals carry fields, and a graduation follows an approval

Decided, and graduated with its own pull request. Ben asked to close three limits the harness listed as open: proposals were keyword-matched and could graduate in the pull request that added them, retiring a rule was not tied to a proposal, and the target-size check failed without a clear word when Chrome was missing. This records how those read now. No inventory changes, so it lists no changes and graduates at once.

Rule or input: how `check:inventories`, `check:opt-outs` and `check:retirement` read proposals, a new repository-wide check `check:proposals`, and how `check:target-size` finds Chrome. No product input, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config changes. `check:rules` does not change, so no product can opt out of anything new.

- **Fields, not keywords.** A proposal starts with front matter. `status` is `open`, `decided` or `graduated`. `changes` lists, exactly, each inventory name the proposal changes, or `[]`. `retires` lists rules it takes out of `check:rules`, and `opts-out` lists `<rule> for <product paths.source>`. The body needs `## Reason`, `## Preview` and `## Graduation` sections with text under each. A file without them fails `check:proposals`. A name matches only as listed: `layouts/side-panel/` no longer names `side-panel`.
- **Graduation follows approval.** A request is approved by moving it from `open` to `decided`, in a pull request a designer reviews. A later pull request graduates it: it makes the change and moves the proposal to `graduated`. An inventory change, a new opt-out or a retired rule passes only when it graduates a proposal that is `decided` on the base and lists it, read as the base has it, so the graduating pull request cannot add a name the approval did not list. Names are pinned, not values. A proposal added in the same pull request covers nothing. `check:proposals` fails any other status move, and any change to what a decided proposal covers.
- **Retirement needs a proposal.** `check:retirement` compares `check:rules` with the base. A rule that leaves it fails unless a graduating proposal lists it under `retires`. A new opt-out fails unless it names a graduating proposal whose `opts-out` lists it for that product. `check:opt-outs` reads the same field and needs the proposal `graduated`.
- **Chrome.** `npm run setup:chrome` installs the chrome-headless-shell build that the repository's `puppeteer-core` pins into `.cache/chrome`. CI runs the same script, cached, in place of downloading the latest stable Chrome on every run. `check:target-size` looks at `CHROME_PATH`, then that install, then a system Chrome. When none is there, it names each place it looked and the two fixes. A Chrome that does not start, and a port 4173 already in use, each get their own message.

Proposals 0001 and 0003 to 0009 move to the fields: 0001 stays `open`, and the rest are `graduated`, because each landed with its change. Their `Status:` lines become plain prose. That edit, and a status moving one step on approval or graduation, are the only edits a merged proposal takes.

## Reason

The checks are the part of the loop that does not need the agent's cooperation. Each of these three gaps leaned on it.

A file with the words reason, preview and graduation, naming the member anywhere, let any inventory change through. And the check could not tell a decision landing with its change from a request graduating before anyone approved it, so pull request 7 could add `Card` and `status-board` with a proposal written in the same change. A field the check reads, and a status the base has to show as decided, replace both guesses. A designer's approval is now something the check can see: the pull request that moved the proposal to `decided` was reviewed before it merged.

Taking a rule out of `check:rules` only asked for review on `package.json`. Now it needs the decision on record before it lands, the same way an inventory change does, and so does an opt-out.

A missing Chrome failed with one line about `CHROME_PATH`, which left a new contributor to guess. Installing a pinned build the same way everywhere also means a local run and CI measure in the same browser.

## Preview

`check:inventories` on a pull request that adds `side-panel` to `allowed_layouts` with a new proposal that lists it:

```
inventory: set changed without a proposal. An inventory grows only by graduating a proposal a designer already approved.
inventory: allowed_layouts changed from ["app-shell"] to ["app-shell","side-panel"]. No graduating proposal covers it: one decided proposal must list "side-panel" under changes.
inventory:   proposals/0102-side-panel.md is added in this change. A proposal cannot graduate in the pull request that adds it: merge it as "status: decided" first.
```

The same change after `0102` merged as decided, with this pull request moving it to `graduated`:

```
inventory: allowed_layouts changed from ["app-shell"] to ["app-shell","side-panel"]. Graduates proposals/0102-side-panel.md.
```

`check:retirement` on a pull request that drops `check:target-size` from `check:rules`:

```
retirement: compared with eb7ca14, these rule changes graduate no decided proposal:
- check:target-size left check:rules without a proposal that retires it. Retire a rule by graduating a proposal, decided on the base, that lists it under retires.
```

`check:target-size` with no Chrome:

```
target size: no headless Chrome found, and this check measures the built app in one.
Looked for CHROME_PATH (unset), .cache/chrome/chrome-headless-shell/linux-148.0.7778.97/chrome-headless-shell-linux64/chrome-headless-shell (npm run setup:chrome), and /usr/bin/google-chrome-stable, /usr/bin/google-chrome, /usr/bin/chromium, /usr/bin/chromium-browser.
Fix it with one of: npm run setup:chrome, which downloads chrome-headless-shell 148.0.7778.97 into .cache/chrome; or CHROME_PATH=/path/to/chrome npm run check:target-size -- --config <product config>.
```

## Graduation

- No file changes on approval. These change in the same pull request:
  - `packages/harness/src/lib/proposals.ts` reads the fields and sections, and `lib/base.ts` resolves the pull request base for the three checks that compare with it.
  - `packages/harness/src/check-inventories.ts`, `check-opt-outs.ts`, `lib/opt-outs.ts`, `check-retirement.ts`, and the new `check-proposals.ts`.
  - `packages/harness/src/lib/chrome.ts`, `setup-chrome.ts` and `check-target-size.ts`, `.github/workflows/ci.yml`, `.gitignore`, and `package.json`, which adds `check:proposals` to `check` and adds `setup:chrome`.
  - Proposals 0001 and 0003 to 0009, the proposal fixtures, and the docs.
- An approved pattern still graduates as two pull requests: one a designer reviews to move the proposal to `decided`, then the change. That is slower than a decision landing with its change, which is the point: the check can only see an approval that is already on the base.
- What the checks still cannot do: judge whether a reason is good or a preview is right, see that the person who approved a proposal was a designer when `main` has no branch protection, check that a graduating change set a value, such as `TARGET_MIN_PX`, to the number the preview showed, or gate a change to the harness's own code, such as a rule's script in `package.json` pointed at other code, which `CODEOWNERS` covers instead.
