import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

/** The file at `rev`, or undefined when that commit is not in this clone. */
export function showPast(rev: string, file: string): string | undefined {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", `${rev}^{commit}`], { cwd: repoRoot, stdio: "ignore" });
  } catch {
    return undefined;
  }
  return execFileSync("git", ["show", `${rev}:${file}`], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** The file at `rev`. Skips the test when the commit is not in this clone. */
export function pastOrSkip(ctx: { skip: (note?: string) => never }, rev: string, file: string): string {
  const text = showPast(rev, file);
  if (text === undefined) ctx.skip(`needs full history: ${rev} is not in this clone`);
  return text;
}
