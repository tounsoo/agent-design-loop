import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SKIP = new Set(["node_modules", "dist", "coverage", ".cache", ".git", ".vite"]);

/** Files under `root`, as repo-relative paths. `under` limits the walk. */
export function repoFiles(root: string, include: (rel: string) => boolean, under = "."): Map<string, string> {
  const files = new Map<string, string>();
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      const rel = path.relative(root, full).split(path.sep).join("/");
      if (include(rel)) files.set(rel, readFileSync(full, "utf8"));
    }
  };
  visit(path.join(root, under));
  return files;
}

export function readText(root: string, rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

/** Prints claim problems and exits when there are any. A `review-note:` line is an anchor, printed on its own. */
export function reportProblems(problems: readonly string[], banner: string, ok: string): void {
  if (problems.length === 0) {
    console.log(ok);
    return;
  }
  const anchors = problems.filter((problem) => problem.startsWith("review-note: "));
  const claims = problems.filter((problem) => !problem.startsWith("review-note: "));
  for (const anchor of anchors) console.error(anchor);
  if (claims.length > 0) {
    console.error(banner);
    for (const claim of claims) console.error(`- ${claim}`);
  }
  process.exit(1);
}
