## Why

<!-- What the change is for, in a sentence or two. -->

## What changed

<!-- The files or behavior, with each proposal it opens, decides or adopts. -->

## Screenshots

<!--
A change to what a product renders: run `npm run screenshots` at the design loop's screenshots node,
commit the folder under products/<name>/review/screenshots/<change>/, run the --pin line it prints, commit README.md again, and paste the line --pin prints here,
a plain link to the gallery at the pushed commit's full SHA. Replace <sha> in the line it prints, and keep its whole https://github.com/ address:
a relative path breaks in the GitHub app and in email, and a branch link breaks once the branch is deleted.
Once pinned, each image in the gallery opens its raw PNG, full size, on a click.
A change that renders nothing: write "None, nothing renders differently."
-->

## Critique

<!--
A change to what a product renders: paste the block `npm run critique -- ... --findings <file> --trace <trace>` prints at the design loop's critique node,
after the screenshots: the round, the critic's model, the edge it took and each finding on one line.
A change that renders nothing: write "None, nothing renders differently."
-->

## Verification

<!--
The verify skill's verdict (PASS, FAIL or BLOCKED) on the tested commit, then one line: the full SHA of the head the checks ran on, each command, and its result.

Tested commit: `<full sha>`. Commands: `npm run check:fixtures` (pass), `npm run check` (pass).
-->

## Unverified checks

<!-- Each check you did not run, including each verify step that ended BLOCKED, and why. Write "None." only when every check ran. -->

## Remaining risks

<!-- What could still break after merge, and who would notice. Write "None known." only after you looked. -->

## Docs vs code

<!-- Each place the docs and the code disagree, or "None found." -->
