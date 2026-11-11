import { execFileSync } from "node:child_process";

/**
 * The pull request base a change is compared with: `INVENTORY_BASE` when it is
 * set, as CI sets it to the pull request's base SHA, or on a push to `main` to
 * the tip before the push. Unset, the merge base with `origin/main`, or with a
 * local `main`. Throws with a message that says how to fix it.
 */

export function tryGit(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

export function resolveBaseRev(): string {
  const fromEnv = process.env.INVENTORY_BASE?.trim();
  if (fromEnv && fromEnv !== "true" && fromEnv !== "false" && !/^0+$/.test(fromEnv)) {
    if (!/^[A-Za-z0-9._/^~-]+$/.test(fromEnv) || fromEnv.startsWith("-")) throw new Error(`refusing base rev "${fromEnv}".`);
    if (!tryGit(["rev-parse", "--verify", "--quiet", `${fromEnv}^{commit}`])) {
      throw new Error(`base rev ${fromEnv} is not in this clone. Fetch the pull request base.`);
    }
    return fromEnv;
  }
  const main = ["origin/main", "main"].find((rev) => tryGit(["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]));
  if (!main) throw new Error("cannot find main. Fetch the pull request base.");
  const head = tryGit(["rev-parse", "HEAD"])?.trim();
  const mainSha = tryGit(["rev-parse", main])?.trim();
  if (!head || !mainSha) throw new Error("cannot resolve HEAD.");
  if (head === mainSha) return mainSha;
  const base = tryGit(["merge-base", "HEAD", main])?.trim();
  if (!base) throw new Error("cannot resolve the pull request base.");
  return base;
}
