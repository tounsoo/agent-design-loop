import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { LoopGraph } from "./loop";
import { literal, isRecord } from "./parse-config";
import { resolveBaseRev } from "./base";
import { loopKey, type LoopAt } from "./trace";

/**
 * Which design loop each line of a trace was recorded under, read from git.
 *
 * A trace is a record of walks, and the loop changes over time. A run an agent
 * walked last week followed last week's loop, so holding its lines to today's
 * loop fails a record that was true when it was written: a pull request that
 * merges main after the loop gained a step would have to rewrite its history.
 * So each line is read against `packages/harness/design-loop.ts` as it stood
 * in the commit that added the line, which `git blame` names. A line not yet
 * committed, or a trace git does not track, is read against the loop in the
 * working tree, the one an agent walks now.
 *
 * Three guards keep history from loosening the check:
 * - A loop counts only when it is the working tree's or one the base's
 *   history holds. A loop a branch made and then dropped never reached
 *   review, so a line recorded under it is read against today's loop.
 * - A line is read against the newest loop of any line up to it, so an older
 *   line after a line someone edited or inserted later takes the newer loop.
 * - In a shallow clone, blame gives every line older than the cut to the
 *   cut's commit, so a line dated there is a problem, not a guess.
 */

/** The design loop's file, from the repository root, as git names it at any commit. */
export const LOOP_FILE = "packages/harness/design-loop.ts";

/** Runs git in `cwd` and gives its output, or null when it fails. */
export type Git = (args: string[]) => string | null;

export function gitIn(cwd?: string): Git {
  return (args) => {
    try {
      return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
    } catch {
      return null;
    }
  };
}

/**
 * The graph a version of design-loop.ts exports, read from its source text
 * without running it. The file is a plain literal: `const designLoop = { ... }
 * as const satisfies LoopGraph`, exported as the default. Throws when the
 * text is not of that shape.
 */
export function loopFromSource(text: string, label: string): LoopGraph {
  const source = ts.createSourceFile(label, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exported = source.statements.find((statement): statement is ts.ExportAssignment => ts.isExportAssignment(statement) && !statement.isExportEquals);
  if (!exported) throw new Error(`${label} has no default export.`);
  let value: ts.Expression = exported.expression;
  if (ts.isIdentifier(value)) {
    const name = value.text;
    const declaration = source.statements
      .filter(ts.isVariableStatement)
      .flatMap((statement) => [...statement.declarationList.declarations])
      .find((item) => ts.isIdentifier(item.name) && item.name.text === name);
    if (!declaration?.initializer) throw new Error(`${label} exports ${name}, which it does not declare with a value.`);
    value = declaration.initializer;
  }
  while (ts.isAsExpression(value) || ts.isSatisfiesExpression(value) || ts.isParenthesizedExpression(value)) value = value.expression;
  const graph = literal(value, "design loop");
  if (!isRecord(graph) || typeof graph.start !== "string" || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !Array.isArray(graph.state)) {
    throw new Error(`${label} does not export a design loop with start, state, nodes and edges.`);
  }
  return graph as unknown as LoopGraph;
}

/** Each line's commit, from `git blame --porcelain`, by line number. The all-zero commit is a line not yet committed. */
export function blameCommits(porcelain: string): Map<number, string> {
  const lines = new Map<number, string>();
  for (const row of porcelain.split("\n")) {
    // A header row: <40 hex> <line in the commit> <line now> [<lines in the group>]. Content rows start with a tab.
    const header = /^([0-9a-f]{40}) \d+ (\d+)(?: \d+)?$/.exec(row);
    if (header?.[1] && header[2]) lines.set(Number(header[2]), header[1]);
  }
  return lines;
}

const UNCOMMITTED = /^0+$/;

/**
 * The loop each line of `file` was recorded under. `current` is the loop in
 * the working tree, and `base` the revision the change is compared with,
 * whose history names the loops a line may be read against. Without a base,
 * any loop a commit holds counts. A line whose loop cannot be known is a
 * problem, not a guess.
 */
export function recordedLoops(file: string, current: LoopGraph, options: { base?: string; cwd?: string } = {}): { loopAt: LoopAt } | { problems: string[] } {
  const git = gitIn(options.cwd);
  // Without a tracked file there is no history: every line is the agent's own, under today's loop.
  if (git(["ls-files", "--error-unmatch", "--", file]) === null) return { loopAt: () => current };
  const porcelain = git(["blame", "--porcelain", "--", file]);
  if (porcelain === null) return { problems: [`git blame cannot read ${file}, so its lines cannot be read against the loop each was recorded under.`] };
  const lines = blameCommits(porcelain);

  const problems: string[] = [];
  if (git(["rev-parse", "--is-shallow-repository"])?.trim() === "true") {
    const shallowFile = git(["rev-parse", "--git-path", "shallow"])?.trim();
    const where = shallowFile ? path.resolve(options.cwd ?? process.cwd(), shallowFile) : "";
    const cut = new Set(where && existsSync(where) ? readFileSync(where, "utf8").split("\n").filter(Boolean) : []);
    const dated = [...lines].filter(([, commit]) => cut.has(commit)).map(([line]) => line);
    if (dated.length > 0) {
      problems.push(`${file} line ${dated[0]} is dated to the cut of a shallow clone, so the loop it was recorded under is unknown. Fetch the full history, with git fetch --unshallow, and run it again.`);
      return { problems };
    }
  }

  const byBlob = new Map<string, LoopGraph>();
  const loadAt = (commit: string): LoopGraph | string => {
    const blob = git(["rev-parse", "--verify", "--quiet", `${commit}:${LOOP_FILE}`])?.trim();
    if (!blob) return `which has no ${LOOP_FILE} to read the line against.`;
    const known = byBlob.get(blob);
    if (known) return known;
    try {
      const text = git(["cat-file", "blob", blob]);
      if (text === null) throw new Error("git cannot read it.");
      const graph = loopFromSource(text, `${LOOP_FILE} at ${commit.slice(0, 7)}`);
      byBlob.set(blob, graph);
      return graph;
    } catch (error) {
      return `whose ${LOOP_FILE} cannot be read: ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  // The loops a line may be read against: today's, and every version the base's history holds.
  let allowed: Set<string> | null = null;
  if (options.base !== undefined) {
    const history = git(["log", "--format=%H", options.base, "--", LOOP_FILE]);
    if (history === null) return { problems: [`git cannot read the history of ${LOOP_FILE} at ${options.base}.`] };
    allowed = new Set([loopKey(current)]);
    for (const commit of history.split("\n").filter(Boolean)) {
      const graph = loadAt(commit);
      if (typeof graph !== "string") allowed.add(loopKey(graph));
    }
  }

  const byCommit = new Map<string, LoopGraph>();
  for (const [line, commit] of [...lines].sort(([a], [b]) => a - b)) {
    if (UNCOMMITTED.test(commit) || byCommit.has(commit)) continue;
    const graph = loadAt(commit);
    if (typeof graph === "string") problems.push(`${file} line ${line} was recorded in commit ${commit.slice(0, 7)}, ${graph}`);
    // A loop the base never had is read as today's, the strict reading.
    else byCommit.set(commit, allowed && !allowed.has(loopKey(graph)) ? current : graph);
  }
  if (problems.length > 0) return { problems };

  // Each line takes the newest loop of any line up to it. Newest is nearest HEAD in git's order; a line not yet committed is newer still.
  const order = new Map((git(["rev-list", "--topo-order", "HEAD"]) ?? "").split("\n").filter(Boolean).map((commit, index) => [commit, index] as const));
  const effective = new Map<number, LoopGraph>();
  let newest: { rank: number; graph: LoopGraph } | null = null;
  for (const [line, commit] of [...lines].sort(([a], [b]) => a - b)) {
    const uncommitted = UNCOMMITTED.test(commit);
    const rank = uncommitted ? -1 : (order.get(commit) ?? Infinity);
    const graph = uncommitted ? current : (byCommit.get(commit) ?? current);
    if (!newest || rank <= newest.rank) newest = { rank, graph };
    effective.set(line, newest.graph);
  }
  return { loopAt: (line) => effective.get(line) ?? current };
}

/** The base to read a trace's history against, for the tools an agent runs as it walks: the change's base when it resolves, none otherwise. check:trace, the gate, needs a base. */
export function loopBase(): { base?: string } {
  const base = resolveBaseRev("trace");
  return "rev" in base ? { base: base.rev } : {};
}
