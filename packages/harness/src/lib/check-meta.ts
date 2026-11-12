/**
 * What a harness script says about itself. Every file under src/ that an npm
 * script runs has a `<file>.meta.ts` beside it that exports `meta`, typed
 * `satisfies CheckMeta`. `npm run docs:gen` writes the check reference from
 * these, and `check:docs` fails when a doc it writes is stale or a script has
 * no meta.
 *
 * Only what the code cannot show is written here. The script's name comes
 * from package.json; whether it is a rule check from `check:rules`; whether
 * it needs `--config`, compares with the base or opens Chrome from what its
 * file imports and calls; its fixture cases from each case.ts. For a script that loads
 * lib/config.ts, a meta's `flags` are what it accepts besides `--config`, so
 * a flag cannot be documented without being read, or read without being
 * documented. A script that parses its own arguments keeps them in step by
 * hand, and one that parses `--config` itself lists it here.
 */

export type CheckFlag = {
  /** The flag as typed, such as `--base`. */
  readonly name: `--${string}`;
  /** The value it takes, such as `<file>`, or nothing for a switch. */
  readonly value?: string;
  /** What it does, as one sentence. */
  readonly what: string;
};

export type CheckMeta = {
  /** One sentence: what the script is for. The README, CLAUDE.md and the reference's table show it. */
  readonly summary: string;
  /** The flags it reads besides `--config`. */
  readonly flags?: readonly CheckFlag[];
  /** What it fails, one item per failure, in the words the code implements. A tool fails nothing and leaves this out. */
  readonly fails?: readonly string[];
  /** How it works and what it cannot see, as paragraphs. */
  readonly details?: readonly string[];
  /** True for a helper the build gate does not run, such as `screenshots`. */
  readonly tool?: true;
};
