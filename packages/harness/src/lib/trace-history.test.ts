import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import designLoop from "../../design-loop";
import type { LoopGraph } from "./loop";
import { traceProblems } from "./trace";
import { blameCommits, LOOP_FILE, loopFromSource, recordedLoops } from "./trace-history";

/** A design-loop.ts as the repository writes it: a typed literal, exported by name. */
const loopSource = (graph: LoopGraph): string =>
  `import type { LoopGraph } from "./src/lib/loop";\n\nconst designLoop = ${JSON.stringify(graph, null, 2)} as const satisfies LoopGraph;\n\nexport default designLoop;\n`;

const before: LoopGraph = {
  start: "build",
  state: [{ id: "ui", what: "The UI." }],
  nodes: [
    { id: "build", kind: "llm", label: "Build", writes: ["ui"] },
    { id: "checks", kind: "eval", label: "Check", run: ["check"], reads: ["ui"] },
    { id: "done", kind: "checkpoint", label: "Open the pull request" },
  ],
  edges: [
    { from: "build", to: "checks" },
    { from: "checks", to: "done", when: "pass" },
    { from: "checks", to: "build", when: "fail" },
  ],
};
/** The loop after it gained a review step, as the design loop gained critique after screenshots. */
const after: LoopGraph = {
  ...before,
  nodes: [...before.nodes, { id: "review", kind: "llm", label: "Review" }],
  edges: [{ from: "build", to: "checks" }, { from: "checks", to: "review", when: "pass" }, { from: "checks", to: "build", when: "fail" }, { from: "review", to: "done" }],
};

const lines = (...steps: object[]): string => steps.map((step) => `${JSON.stringify(step)}\n`).join("");
const oldRun = lines({ node: "build" }, { node: "checks", when: "pass" }, { node: "done" });
const newRun = lines({ node: "build" }, { node: "checks", when: "pass" }, { node: "review" }, { node: "done" });
const TRACE = "traces/change.jsonl";

let repo = "";
afterEach(() => {
  if (repo) rmSync(repo, { recursive: true, force: true });
  repo = "";
});

const git = (dir: string, ...args: string[]): void => {
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: dir, stdio: "ignore" });
};

/** A new repository in a temporary folder, with `write` putting a file in it. */
function newRepo(): { dir: string; write: (file: string, text: string) => void; commit: (message: string) => void } {
  const dir = mkdtempSync(path.join(tmpdir(), "trace-history-"));
  repo = dir;
  git(dir, "init", "-q");
  return {
    dir,
    write: (file, text) => {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      writeFileSync(path.join(dir, file), text);
    },
    commit: (message) => {
      git(dir, "add", "-A");
      git(dir, "commit", "-q", "-m", message);
    },
  };
}

/** A repository whose loop gains a review step after the trace's first run is committed, the way PRs 48 and 49 met main. */
function repoWithLoopChange(): string {
  const { dir, write, commit } = newRepo();
  write(LOOP_FILE, loopSource(before));
  write(TRACE, oldRun);
  commit("walk the old loop");
  write(LOOP_FILE, loopSource(after));
  commit("add a review step to the loop");
  return dir;
}

describe("loopFromSource", () => {
  it("reads the repository's own design-loop.ts as the module exports it", () => {
    expect(loopFromSource(readFileSync(LOOP_FILE, "utf8"), LOOP_FILE)).toEqual(JSON.parse(JSON.stringify(designLoop)));
  });

  it("refuses a file that is not a plain literal loop", () => {
    expect(() => loopFromSource("export default makeLoop();\n", "x.ts")).toThrow("design loop must be a plain literal, not computed.");
  });
});

describe("blameCommits", () => {
  it("reads each line's commit from git blame's porcelain, including a line not yet committed", () => {
    const sha = "a".repeat(40);
    const zero = "0".repeat(40);
    const porcelain = [`${sha} 1 1 2`, "author Test", "filename t.jsonl", "\t{}", `${sha} 2 2`, "\t{}", `${zero} 3 3 1`, "author Not Committed Yet", "\t{}", ""].join("\n");
    expect([...blameCommits(porcelain)]).toEqual([
      [1, sha],
      [2, sha],
      [3, zero],
    ]);
  });
});

describe("recordedLoops", () => {
  it("fails a run committed before the loop changed when it is read against today's loop, the bug this guards", () => {
    const dir = repoWithLoopChange();
    expect(traceProblems(after, readFileSync(path.join(dir, TRACE), "utf8"))).toContain(
      "line 3 goes from checks when pass to done, an edge the graph does not have. It goes to review.",
    );
  });

  it("reads each committed line against the loop of its commit, and passes the run as it was walked", () => {
    const dir = repoWithLoopChange();
    const loops = recordedLoops(TRACE, after, { cwd: dir });
    if ("problems" in loops) throw new Error(loops.problems.join("\n"));
    expect(loops.loopAt(1)).toEqual(before);
    expect(traceProblems(loops.loopAt, readFileSync(path.join(dir, TRACE), "utf8"))).toEqual([]);
  });

  it("reads a line not yet committed against the loop in the working tree, so a new run walks today's loop", () => {
    const dir = repoWithLoopChange();
    writeFileSync(path.join(dir, TRACE), `${oldRun}${newRun}`);
    const loops = recordedLoops(TRACE, after, { cwd: dir });
    if ("problems" in loops) throw new Error(loops.problems.join("\n"));
    expect(loops.loopAt(4)).toBe(after);
    expect(traceProblems(loops.loopAt, `${oldRun}${newRun}`)).toEqual([]);
    writeFileSync(path.join(dir, TRACE), `${oldRun}${oldRun}`);
    const stale = recordedLoops(TRACE, after, { cwd: dir });
    if ("problems" in stale) throw new Error(stale.problems.join("\n"));
    expect(traceProblems(stale.loopAt, `${oldRun}${oldRun}`)).toContain("line 6 goes from checks when pass to done, an edge the graph does not have. It goes to review.");
  });

  it("reads a trace git does not track against the loop in the working tree", () => {
    const dir = repoWithLoopChange();
    writeFileSync(path.join(dir, "traces/new.jsonl"), oldRun);
    const loops = recordedLoops("traces/new.jsonl", after, { cwd: dir });
    if ("problems" in loops) throw new Error(loops.problems.join("\n"));
    expect(traceProblems(loops.loopAt, oldRun)).toContain("line 3 goes from checks when pass to done, an edge the graph does not have. It goes to review.");
  });

  it("fails a line whose commit has no design loop to read it against", () => {
    const dir = repoWithLoopChange();
    git(dir, "rm", "-q", LOOP_FILE);
    writeFileSync(path.join(dir, TRACE), `${oldRun}${newRun}`);
    git(dir, "commit", "-q", "-am", "drop the loop");
    const loops = recordedLoops(TRACE, after, { cwd: dir });
    expect("problems" in loops && loops.problems[0]).toMatch(/^traces\/change\.jsonl line 4 was recorded in commit [0-9a-f]{7}, which has no packages\/harness\/design-loop\.ts to read the line against\.$/);
  });
  it("reads a run against the loop of its day when the base's history holds that loop", () => {
    const dir = repoWithLoopChange();
    const loops = recordedLoops(TRACE, after, { cwd: dir, base: "HEAD" });
    if ("problems" in loops) throw new Error(loops.problems.join("\n"));
    expect(traceProblems(loops.loopAt, oldRun)).toEqual([]);
  });

  it("reads a line recorded under a loop the base never had against today's loop, so a branch cannot loosen the loop, walk it and put it back", () => {
    const { dir, write, commit } = newRepo();
    write(LOOP_FILE, loopSource(after));
    commit("the loop on main");
    git(dir, "tag", "base");
    // The looser loop lets checks go straight to done, and lives for one commit.
    write(LOOP_FILE, loopSource(before));
    write(TRACE, oldRun);
    commit("loosen the loop and walk it");
    write(LOOP_FILE, loopSource(after));
    commit("put the loop back");
    const loops = recordedLoops(TRACE, after, { cwd: dir, base: "base" });
    if ("problems" in loops) throw new Error(loops.problems.join("\n"));
    expect(traceProblems(loops.loopAt, oldRun)).toContain("line 3 goes from checks when pass to done, an edge the graph does not have. It goes to review.");
  });

  it("reads an older line after a line edited later against the newer loop, as a rename that rewrites a trace leaves it", () => {
    const named = (step: string): LoopGraph => ({
      ...before,
      nodes: [before.nodes[0] as LoopGraph["nodes"][number], { id: step, kind: "llm", label: step }, ...before.nodes.slice(1)],
      edges: [{ from: "build", to: step }, { from: step, to: "checks" }, ...before.edges.slice(1)],
    });
    const { dir, write, commit } = newRepo();
    write(LOOP_FILE, loopSource(named("graduate")));
    write(TRACE, lines({ node: "build" }, { node: "graduate" }, { node: "checks", when: "pass" }, { node: "done" }));
    commit("walk the loop");
    const renamed = lines({ node: "build" }, { node: "adopt" }, { node: "checks", when: "pass" }, { node: "done" });
    write(LOOP_FILE, loopSource(named("adopt")));
    write(TRACE, renamed);
    commit("rename graduate to adopt, in the trace too");
    const loops = recordedLoops(TRACE, named("adopt"), { cwd: dir });
    if ("problems" in loops) throw new Error(loops.problems.join("\n"));
    expect(traceProblems(loops.loopAt, renamed)).toEqual([]);
  });

  it("fails a line dated to the cut of a shallow clone, whose loop is unknown", () => {
    const dir = repoWithLoopChange();
    const shallow = mkdtempSync(path.join(tmpdir(), "trace-history-shallow-"));
    try {
      execFileSync("git", ["clone", "-q", "--depth", "1", `file://${dir}`, shallow], { stdio: "ignore" });
      const loops = recordedLoops(TRACE, after, { cwd: shallow });
      expect("problems" in loops && loops.problems[0]).toContain("line 1 is dated to the cut of a shallow clone, so the loop it was recorded under is unknown. Fetch the full history");
    } finally {
      rmSync(shallow, { recursive: true, force: true });
    }
  });
});
