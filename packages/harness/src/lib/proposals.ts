import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * A proposal is a markdown file with front matter the checks read, and three
 * sections a person reads. The front matter is the only part a check trusts:
 *
 *   ---
 *   status: decided
 *   changes:
 *     - side-panel
 *     - allowed_layouts
 *   retires: []
 *   opts-out:
 *     - check:disclosure for products/nook
 *   ---
 *
 * `status` is `open` (a request), `decided` (approved, not yet applied) or
 * `graduated` (applied). `changes` lists, exactly, each inventory name the
 * proposal changes: a member, a constant, a config field, a new product's
 * directory. `retires` lists rules it takes out of `check:rules`. `opts-out`
 * lists `<rule> for <product paths.source>`. `status` and `changes` are
 * required; an empty list is written `[]`. The body needs a `## Reason`, a
 * `## Preview` and a `## Graduation` section, each with text under it.
 *
 * A change the checks gate, an inventory change, a new opt-out or a retired
 * rule, graduates a proposal: the proposal must already be `decided` on the
 * pull request base, and the pull request marks it `graduated`. What it
 * covers is read from the base, so the graduating pull request cannot widen
 * it. A proposal added in the same pull request covers nothing.
 */

export const STATUSES = ["open", "decided", "graduated"] as const;
export type ProposalStatus = (typeof STATUSES)[number];

export type OptOutEntry = { readonly rule: string; readonly source: string };

export type Proposal = {
  readonly file: string;
  readonly status: ProposalStatus;
  readonly changes: readonly string[];
  readonly retires: readonly string[];
  readonly optsOut: readonly OptOutEntry[];
};

export type ParsedProposal = { readonly proposal: Proposal | null; readonly problems: readonly string[] };

const LIST_KEYS = ["changes", "retires", "opts-out"] as const;
const KEYS = ["status", ...LIST_KEYS] as const;
const REQUIRED_KEYS = ["status", "changes"] as const;
export const SECTIONS = ["Reason", "Preview", "Graduation"] as const;

function frontMatter(lines: readonly string[]): { block: string[]; rest: string[] } | null {
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) return null;
  return { block: lines.slice(1, end), rest: lines.slice(end + 1) };
}

/** `key: value`, `key: []`, or `key:` followed by `  - item` lines. Nothing else is front matter. */
function readFields(block: readonly string[], problems: string[]): Map<string, string | string[]> {
  const fields = new Map<string, string | string[]>();
  let list: string[] | null = null;
  for (const raw of block) {
    if (raw.trim() === "") continue;
    const item = /^\s+-\s+(.+?)\s*$/.exec(raw);
    if (item?.[1]) {
      if (list === null) problems.push(`front matter line "${raw.trim()}" is a list item outside a list.`);
      else list.push(item[1]);
      continue;
    }
    const field = /^([a-z-]+):[ \t]*(.*?)\s*$/.exec(raw);
    if (!field?.[1]) {
      problems.push(`front matter line "${raw.trim()}" is not "key: value" or a "  - item".`);
      list = null;
      continue;
    }
    const [, key, value = ""] = field;
    if (!(KEYS as readonly string[]).includes(key)) problems.push(`front matter has unknown key "${key}". Keys are ${KEYS.join(", ")}.`);
    if (fields.has(key)) problems.push(`front matter gives "${key}" twice.`);
    if (value === "") {
      list = [];
      fields.set(key, list);
    } else if (value === "[]") {
      list = null;
      fields.set(key, []);
    } else {
      list = null;
      fields.set(key, value);
    }
  }
  return fields;
}

/** The body's `## ` sections that start with each required name, and whether each has text under it. */
function sectionProblems(body: readonly string[]): string[] {
  // A heading inside a code block is an example, not a section. A code block under a heading is that section's text.
  let fence: string | null = null;
  const headings: { index: number; level: number; text: string }[] = [];
  body.forEach((line, index) => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) fence = fence === null ? marker : marker.startsWith(fence) ? null : fence;
    else if (fence === null) {
      const heading = /^(#{1,6})[ \t]+(.*)$/.exec(line);
      if (heading?.[1]) headings.push({ index, level: heading[1].length, text: heading[2] ?? "" });
    }
  });
  const problems: string[] = [];
  for (const name of SECTIONS) {
    const position = headings.findIndex((heading) => heading.level === 2 && new RegExp(`^${name}\\b`).test(heading.text));
    const start = headings[position];
    if (start === undefined) {
      problems.push(`has no "## ${name}" section.`);
      continue;
    }
    const end = headings.slice(position + 1).find((heading) => heading.level <= 2)?.index;
    // A comment is not text a reader sees.
    const content = body.slice(start.index + 1, end).join("\n").replace(/<!--[\s\S]*?(?:-->|$(?![\s\S]))/g, "");
    if (content.trim() === "") problems.push(`"## ${name}" section is empty.`);
  }
  return problems;
}

/** Reads a proposal's front matter and sections. Every problem names what is missing or wrong. */
export function parseProposal(file: string, text: string): ParsedProposal {
  const problems: string[] = [];
  const lines = text.split(/\r?\n/);
  const split = frontMatter(lines);
  if (split === null) {
    return { proposal: null, problems: ['has no front matter. Start the file with a "---" block that gives status and changes.'] };
  }
  const fields = readFields(split.block, problems);
  for (const key of REQUIRED_KEYS) if (!fields.has(key)) problems.push(`front matter has no "${key}".`);
  const status = fields.get("status");
  if (fields.has("status") && (typeof status !== "string" || !(STATUSES as readonly string[]).includes(status))) {
    problems.push(`status must be one of ${STATUSES.join(", ")}, not ${JSON.stringify(status)}.`);
  }
  const lists = new Map<string, string[]>();
  for (const key of LIST_KEYS) {
    const value = fields.get(key) ?? [];
    if (typeof value === "string") problems.push(`"${key}" must be a list: "${key}: []" or "  - item" lines under "${key}:".`);
    else lists.set(key, value);
  }
  const optsOut: OptOutEntry[] = [];
  for (const entry of lists.get("opts-out") ?? []) {
    const match = /^(\S+) for (\S+)$/.exec(entry);
    if (match?.[1] && match[2]) optsOut.push({ rule: match[1], source: match[2] });
    else problems.push(`opts-out entry "${entry}" is not "<rule> for <product paths.source>".`);
  }
  problems.push(...sectionProblems(split.rest));
  if (problems.length > 0) return { proposal: null, problems };
  return {
    proposal: {
      file,
      status: status as ProposalStatus,
      changes: lists.get("changes") ?? [],
      retires: lists.get("retires") ?? [],
      optsOut,
    },
    problems,
  };
}

/** True when a proposal's file name makes it a proposal: a .md file other than README.md. */
export function isProposalFile(file: string): boolean {
  return file.endsWith(".md") && path.posix.basename(file) !== "README.md";
}

/** The proposal files directly in `dir` on disk, by repository path, with their text. */
export function proposalsInDir(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  const root = path.resolve(dir);
  if (!existsSync(root)) return files;
  const prefix = path.posix.normalize(dir.split(path.sep).join("/")).replace(/\/+$/, "");
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = `${prefix}/${entry.name}`;
    if (entry.isFile() && isProposalFile(file)) files.set(file, readFileSync(path.join(root, entry.name), "utf8"));
  }
  return files;
}

/** The proposal files directly in `dir` at a git revision, by repository path, with their text. */
export function proposalsAtRev(rev: string, dir: string): Map<string, string> {
  const files = new Map<string, string>();
  const prefix = path.posix.normalize(dir).replace(/\/+$/, "");
  let names: string[];
  try {
    names = execFileSync("git", ["ls-tree", "--name-only", `${rev}:${prefix}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .filter(Boolean);
  } catch {
    return files;
  }
  for (const name of names) {
    const file = `${prefix}/${name}`;
    if (!isProposalFile(file)) continue;
    try {
      files.set(file, execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
    } catch {
      // A subdirectory or an unreadable entry is not a proposal.
    }
  }
  return files;
}

/** Each file parsed, keyed by path. A file that does not parse is left out and its problems returned. */
export function parseAll(files: ReadonlyMap<string, string>): {
  proposals: Map<string, Proposal>;
  unparsed: Set<string>;
  legacy: Set<string>;
  problems: string[];
} {
  const proposals = new Map<string, Proposal>();
  const unparsed = new Set<string>();
  const legacy = new Set<string>();
  const problems: string[] = [];
  for (const [file, text] of [...files].sort(([left], [right]) => left.localeCompare(right))) {
    const parsed = parseProposal(file, text);
    if (parsed.proposal) proposals.set(file, parsed.proposal);
    else {
      unparsed.add(file);
      // Only a file with no front matter at all predates the fields. One with broken fields is not legacy: it failed check:proposals.
      if (frontMatter(text.split(/\r?\n/)) === null) legacy.add(file);
      problems.push(...parsed.problems.map((problem) => `${file} ${problem}`));
    }
  }
  return { proposals, unparsed, legacy, problems };
}

/** Two proposal maps keyed by file name only, so a fixture's base and head folders line up. */
export function byBaseName(files: ReadonlyMap<string, Proposal>): Map<string, Proposal> {
  return new Map([...files].map(([file, proposal]) => [path.posix.basename(file), proposal]));
}

/**
 * The proposals this change graduates: `decided` on the base and `graduated`
 * in the head. Each is returned as the base has it, under the head's file
 * name, so what it covers is what was approved, not what the graduating
 * change says it covers.
 */
export function graduating(base: ReadonlyMap<string, Proposal>, head: ReadonlyMap<string, Proposal>): Proposal[] {
  const found: Proposal[] = [];
  for (const [key, before] of base) {
    const after = head.get(key);
    if (before.status === "decided" && after?.status === "graduated") found.push({ ...before, file: after.file });
  }
  return found.sort((left, right) => left.file.localeCompare(right.file));
}

const sameList = (left: readonly string[], right: readonly string[]) => JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

/**
 * What is wrong with how the head's proposals moved from the base's. A
 * request is approved by moving it from `open` to `decided`, and graduated by
 * moving it from `decided` to `graduated`, each in its own pull request. Once
 * decided, what a proposal covers does not change. A new proposal may be
 * `graduated` at once only when it covers nothing the checks gate, as a
 * change to the harness's own code does. `legacy` names base files that
 * exist but have no fields, which are not compared.
 */
export function transitionProblems(
  base: ReadonlyMap<string, Proposal>,
  head: ReadonlyMap<string, Proposal>,
  legacy: ReadonlySet<string> = new Set(),
  headUnparsed: ReadonlySet<string> = new Set(),
): string[] {
  const problems: string[] = [];
  // A decided or graduated proposal is the record of what was approved, so it keeps its file name. Renaming one would let a new file widen its lists or graduate it again.
  for (const [key, before] of [...base].sort(([left], [right]) => left.localeCompare(right))) {
    if (before.status === "open" || head.has(key) || headUnparsed.has(key)) continue;
    problems.push(
      `${before.file} is ${before.status} on the base and is gone from this change. A decided or graduated proposal keeps its file name: it is the record of what was approved.`,
    );
  }
  for (const [key, after] of [...head].sort(([left], [right]) => left.localeCompare(right))) {
    // A base file with no fields predates them, so there is no status to move from. It cannot cover a change either: graduating() reads the base.
    if (legacy.has(key)) continue;
    const before = base.get(key);
    const gated = after.changes.length > 0 || after.retires.length > 0 || after.optsOut.length > 0;
    if (before === undefined) {
      if (after.status === "graduated" && gated) {
        problems.push(
          `${after.file} is new and already graduated. A proposal cannot graduate in the pull request that adds it: merge it as "status: decided" first, then graduate it in a later pull request.`,
        );
      }
      continue;
    }
    const move = `${before.status} → ${after.status}`;
    const allowed = before.status === after.status || move === "open → decided" || move === "decided → graduated";
    if (!allowed) {
      const why =
        move === "open → graduated"
          ? "A request is approved (open → decided) in its own pull request before it graduates."
          : "Status moves only open → decided → graduated.";
      problems.push(`${after.file} moved ${move}. ${why}`);
      continue;
    }
    if (before.status !== "open") {
      const changed = (["changes", "retires"] as const).filter((field) => !sameList(before[field], after[field]));
      const optsOut = (entries: readonly OptOutEntry[]) => entries.map((entry) => `${entry.rule} for ${entry.source}`);
      if (!sameList(optsOut(before.optsOut), optsOut(after.optsOut))) changed.push("opts-out" as never);
      if (changed.length > 0) {
        problems.push(`${after.file} is ${before.status} on the base, so its ${changed.join(", ")} cannot change: that is what was approved.`);
      }
    }
  }
  return problems;
}
