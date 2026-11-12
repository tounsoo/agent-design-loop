import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "The check reference and the docs that copy it are the ones the code writes: `npm run docs:gen` rewrites them.",
  flags: [{ name: "--write", what: "Rewrites the stale docs. `npm run docs:gen` runs it with this flag." }],
  fails: [
    "`packages/harness/docs/checks.md`, or a generated block in the harness README, `CLAUDE.md` or the verify skill, that is not what the code writes now.",
    "A doc missing a block's `<!-- docs:gen <block> start -->` or `end` marker, or holding either twice.",
    "An npm script that runs a harness file with no `<file>.meta.ts` beside it, or a meta no script runs.",
    "A meta that is not a tool and lists nothing it fails, or a rule check whose meta says it is a tool.",
    "A `.meta.ts` that does not export `meta`, a script that imports a relative file that is not there, and a `case.ts` that is not plain literals.",
    "A meta that names a fixture case `illegal/<name>` or an `npm run <script>` that does not exist, and a fixture case that runs a script that is not a harness script.",
  ],
  details: [
    "Each harness script's meta, `packages/harness/src/<file>.meta.ts`, typed `satisfies CheckMeta`, gives the words: a summary, the flags it reads, what it fails, and how it works. Everything else is read from the code: script names and the build gate from `package.json`, rule checks from `check:rules`, `--config` from whether the script loads `lib/config.ts`, the base from whether it calls `resolveBaseRev`, Chrome from whether it loads `puppeteer-core`, and fixture cases from each `case.ts` and its doc comment. For a script that loads `lib/config.ts`, the config loader accepts only the flags its meta lists, so a documented flag is a read one.",
    "So a pull request that adds or changes a check updates its meta and runs `npm run docs:gen`, which keeps `CLAUDE.md` and the verify skill current with it.",
  ],
} satisfies CheckMeta;
