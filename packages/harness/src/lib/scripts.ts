import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The repository's npm scripts, and which of them run one harness check. A
 * check script is `tsx <harness src>/<check>.ts`, where the harness src is
 * this package's own src folder as seen from the repository root, so the
 * harness can sit anywhere in the repository.
 */

const harnessSrc = path.relative(process.cwd(), path.dirname(path.dirname(fileURLToPath(import.meta.url)))).split(path.sep).join("/");

export const scripts = (JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts;

/** The check file a script runs, or null when the script is not one harness check. */
export function checkFile(command: string): string | null {
  const prefix = `tsx ${harnessSrc}/`;
  if (!command.startsWith(prefix)) return null;
  const file = command.slice(4);
  return /^[\w-]+\.ts$/.test(command.slice(prefix.length)) ? file : null;
}

/**
 * The rule checks, as their npm script names: the scripts `check:rules`
 * runs, in its order, following nested `npm run` steps. A rule a product can
 * opt out of is one of these.
 */
export function ruleChecks(name = "check:rules", seen: ReadonlySet<string> = new Set()): string[] {
  const command = scripts[name];
  if (command === undefined) throw new Error(`package.json has no script "${name}".`);
  if (seen.has(name)) throw new Error(`package.json script "${name}" runs itself.`);
  const found: string[] = [];
  for (const part of command.split("&&").map((step) => step.trim())) {
    const nested = /^npm run ([\w:-]+)$/.exec(part);
    if (nested?.[1]) found.push(...ruleChecks(nested[1], new Set([...seen, name])));
    else if (checkFile(part) !== null) found.push(name);
  }
  return found;
}
