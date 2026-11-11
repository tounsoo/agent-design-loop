import { execFileSync } from "node:child_process";

/**
 * The base a change is compared with, for the checks that read what a pull
 * request changed. `INVENTORY_BASE` names it when set: CI sets it to the pull
 * request base, or on a push to main to the tip of main before the push.
 * Unset, it is the merge base with `origin/main`, or with a local `main`.
 */

/** git's output, or null when git exits non-zero. */
export function tryGit(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/** The base revision, or a problem prefixed with `name`, the check's own prefix. */
export function resolveBaseRev(name: string): { rev: string } | { problem: string } {
  const fromEnv = process.env.INVENTORY_BASE?.trim();
  if (fromEnv && fromEnv !== "true" && fromEnv !== "false" && !/^0+$/.test(fromEnv)) {
    if (!/^[A-Za-z0-9._/^~-]+$/.test(fromEnv) || fromEnv.startsWith("-")) return { problem: `${name}: refusing base rev "${fromEnv}".` };
    if (!tryGit(["rev-parse", "--verify", "--quiet", `${fromEnv}^{commit}`])) {
      return { problem: `${name}: base rev ${fromEnv} is not in this clone. Fetch the pull request base.` };
    }
    return { rev: fromEnv };
  }
  const main = ["origin/main", "main"].find((rev) => tryGit(["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]));
  if (!main) return { problem: `${name}: cannot find main. Fetch the pull request base.` };
  const head = tryGit(["rev-parse", "HEAD"])?.trim();
  const mainSha = tryGit(["rev-parse", main])?.trim();
  if (!head || !mainSha) return { problem: `${name}: cannot resolve HEAD.` };
  if (head === mainSha) return { rev: mainSha };
  const mergeBase = tryGit(["merge-base", "HEAD", main])?.trim();
  return mergeBase ? { rev: mergeBase } : { problem: `${name}: cannot resolve the pull request base.` };
}
