import { readFileSync, writeSync } from "node:fs";
import path from "node:path";
import { format } from "node:util";

/**
 * What a check found, as data: `--json` on a rule check, `check:opt-outs` or
 * `check:product` prints one `CheckReport` on stdout and nothing else, so a
 * tool such as the studio reads a run without parsing its text. Without the
 * flag nothing here prints anything a check did not print before, and the
 * exit code is the same with it or without it.
 *
 * A check routes each finding through `fail`, which prints its line as before
 * and, with `--json`, records it with the location the check knows. With
 * `--json`, the run is reported whatever ends it: every other line a check or
 * a module it loads writes to stderr, such as a config it cannot read, is a
 * finding too, an uncaught error is one, and everything else written to
 * stdout goes to stderr. The report is written as the process exits, and its
 * status is the exit code's: `pass` for 0, `fail` otherwise.
 */

/** Where a finding is, as far as the check that made it knows. Each field is there only when the check knows it. */
export type FindingLocation = {
  /** A repository path, as the check prints it. */
  readonly file?: string;
  /** The line in `file`, from 1. */
  readonly line?: number;
  /** The page it is on, as the check names it, such as a page type. */
  readonly page?: string;
  /** The scenario a Chrome check opened, by id. */
  readonly scenario?: string;
  /** The modeled flow state that scenario renders. */
  readonly state?: string;
  /** The view it was seen in, by name, such as `phone-light`. */
  readonly view?: string;
};

export type Finding = FindingLocation & {
  /** The line the check prints for it without `--json`. */
  readonly message: string;
};

/** A run's result: `pass` or `fail`. In `check:product`'s list, a rule it did not run is `skipped` by an opt-out or `not-run` after an earlier check failed. */
export type CheckStatus = "pass" | "fail" | "skipped" | "not-run";

/** What `--json` prints, the same for every check. */
export type CheckReport = {
  /** The check's npm script, such as `check:disclosure`. */
  readonly check: string;
  /** The config `--config` named, or null when the run had none. */
  readonly config: string | null;
  readonly status: CheckStatus;
  /** Every finding, in the order the check printed them. A run that passed has none. */
  readonly findings: readonly Finding[];
  /** On a `skipped` rule: the proposal the product opts out of it in. */
  readonly optOut?: string;
  /** `check:product` only: one report for each check it runs, in order, `check:opt-outs` first, every rule in `check:rules` after it. */
  readonly checks?: readonly CheckReport[];
};

/** True when the run was asked for `--json`. */
export const jsonMode = process.argv.slice(2).includes("--json");

/** A repository path followed by a line, such as `products/nook/src/page.tsx:12`. */
const PATH_LINE = /(?:^|[\s("'`])((?:[\w@.-]+\/)*[\w@.-]+\.(?:tsx?|jsx?|mjs|cjs|css|md|json|html)):(\d+)(?![\w.])/;

/**
 * A finding for a printed line. A check that prints a location as
 * `<file>:<line>` in the line gives it that file and line, the first one the
 * line names, unless `where` names a file.
 */
export function finding(message: string, where: FindingLocation = {}): Finding {
  const found = where.file === undefined ? PATH_LINE.exec(message) : null;
  const lifted: FindingLocation = found?.[1] && found[2] ? { file: found[1], line: Number(found[2]) } : {};
  return { message, ...lifted, ...where };
}

/** The scenario and state a line about one names, when it starts `scenario <id>` (or `<id>` with `bare`) and then a space, comma or colon. */
export function scenarioOf(message: string, scenarios: readonly { readonly id: string; readonly state: string }[], bare = false): FindingLocation {
  const prefix = bare ? "" : "scenario ";
  const match = [...scenarios]
    .sort((a, b) => b.id.length - a.id.length)
    .find((scenario) => message.startsWith(`${prefix}${scenario.id}`) && /^[\s,:]/.test(message.slice(prefix.length + scenario.id.length)));
  return match ? { scenario: match.id, state: match.state } : {};
}

/**
 * The report a run prints. A run that failed with no finding gets one that
 * says so, so a failure always carries a reason.
 */
export function buildReport(input: { check: string; config: string | null; code: number; findings: readonly Finding[]; checks?: readonly CheckReport[] }): CheckReport {
  const status = input.code === 0 ? "pass" : "fail";
  const nested = input.checks?.some((item) => item.findings.length > 0) ?? false;
  const findings =
    status === "fail" && input.findings.length === 0 && !nested ? [finding(`${input.check} exited with status ${input.code} and printed no reason.`)] : input.findings;
  return { check: input.check, config: input.config, status, findings, ...(input.checks ? { checks: input.checks } : {}) };
}

/** The npm script that runs `script`, read from package.json, or the file's own name when none does. */
function checkName(script: string): string {
  try {
    const { scripts } = JSON.parse(readFileSync("package.json", "utf8")) as { scripts?: Record<string, string> };
    for (const [name, command] of Object.entries(scripts ?? {})) {
      const file = /^tsx (\S+\.ts)$/.exec(command)?.[1];
      if (file && path.resolve(file) === path.resolve(script)) return name;
    }
  } catch {
    // No package.json here: the file's name stands in.
  }
  return path.basename(script, ".ts");
}

function configArg(): string | null {
  const index = process.argv.indexOf("--config");
  const value = index === -1 ? undefined : process.argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

const findings: Finding[] = [];
let nestedChecks: CheckReport[] | undefined;
const printError = console.error.bind(console);

function writeAll(fd: number, text: string): void {
  const buffer = Buffer.from(text);
  let offset = 0;
  while (offset < buffer.length) {
    try {
      offset += writeSync(fd, buffer, offset);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EAGAIN") throw error;
    }
  }
}

if (jsonMode) {
  process.stdout.write = process.stderr.write.bind(process.stderr) as typeof process.stdout.write;
  console.error = (...args: unknown[]): void => {
    findings.push(finding(format(...args)));
    printError(...args);
  };
  process.on("uncaughtExceptionMonitor", (error) => {
    findings.push(finding(error instanceof Error ? error.message : String(error)));
  });
  process.on("exit", (code) => {
    const report = buildReport({ check: checkName(process.argv[1] ?? ""), config: configArg(), code, findings, ...(nestedChecks ? { checks: nestedChecks } : {}) });
    writeAll(1, `${JSON.stringify(report)}\n`);
  });
}

/** Prints a finding's line to stderr, as checks print one, and records it with `where` for `--json`. */
export function fail(message: string, where: FindingLocation = {}): void {
  if (jsonMode) findings.push(finding(message, where));
  printError(message);
}

/** Prints a line to stderr that is not a finding, such as a heading above a list of them. */
export function note(message: string): void {
  printError(message);
}

/** Hands `--json` the list of reports a check that runs other checks fills in, as check:product does. */
export function reportChecks(checks: CheckReport[]): void {
  nestedChecks = checks;
}
