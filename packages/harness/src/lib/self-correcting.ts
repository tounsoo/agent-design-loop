import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/** Home's `standards/self-correcting.md` names these paths. This module checks that shape. */

export const AGENTS_PATH = "AGENTS.md";
export const WEEDS_PATH = ".agents/weeds.tsv";
export const BASELINE_PATH = ".agents/suppression-baseline.json";

const WEEDS_HEADER = "date\tclass\tref\tcaught_by\tnote";
const CAUGHT_BY = new Set(["review", "ben", "prod", "revert"]);
const STATUSES = new Set(["enforced", "text", "retired"]);
const COLUMNS = ["ID", "Rule", "Enforcer", "Evidence", "Status"];
const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "coverage", ".cache", ".vite", ".git", ".claude", ".cursor"]);

const MARKERS = [
  ["eslint-", "disable"],
  ["@ts-", "ignore"],
  ["@ts-", "expect-error"],
  ["@ts-", "nocheck"],
  ["biome-", "ignore"],
  ["oxlint-", "disable"],
].map((parts) => parts.join(""));

export type SelfReport = {
  problems: string[];
  machineCaught: { percent: number | null; enforced: number; classes: number };
  repeats: number;
  suppressions: {
    total: number;
    unannotated: number;
    baselineTotal: number | null;
    baselineUnannotated: number | null;
  };
  textRows: string[];
  twiceWithoutEnforcement: string[];
};

type RuleRow = { id: string; enforcer: string; evidence: string; status: string };
type WeedRow = { date: string; className: string };

export function checkRepository(root: string, now = new Date()): SelfReport {
  const problems: string[] = [];
  const today = isoDate(now);
  const rules = readRules(root, problems);
  const weeds = readWeeds(root, problems);
  const suppressions = readSuppressions(root, problems, today);

  const tier = rules?.tier ?? "T0";
  const rows = rules?.rows ?? [];
  const dated = weeds.filter((weed) => isRealDate(weed.date));
  if (tier === "T1") {
    const enforced = new Set(rows.filter((row) => row.status === "enforced").map((row) => row.id));
    const cutoff = addDays(today, -30);
    for (const weed of dated) {
      if (enforced.has(weed.className) && weed.date >= cutoff && weed.date <= today) {
        problems.push(`T1: enforced class "${weed.className}" is in the weeds log on ${weed.date}, within 30 days.`);
      }
    }
  }

  const live = rows.filter((row) => row.status !== "retired");
  const classes = new Set<string>([...live.map((row) => row.id), ...weeds.map((weed) => weed.className)]);
  const enforcedCount = rows.filter((row) => row.status === "enforced").length;
  const byClass = new Map<string, number>();
  for (const weed of weeds) byClass.set(weed.className, (byClass.get(weed.className) ?? 0) + 1);
  const enforcedIds = new Set(rows.filter((row) => row.status === "enforced").map((row) => row.id));
  const twiceWithoutEnforcement = [...byClass.entries()]
    .filter(([className, count]) => count >= 2 && !enforcedIds.has(className))
    .map(([className]) => className)
    .sort();

  const cutoff = addDays(today, -30);
  const seen = new Set<string>();
  let repeats = 0;
  for (const weed of dated) {
    if (seen.has(weed.className) && weed.date >= cutoff && weed.date <= today) repeats += 1;
    seen.add(weed.className);
  }

  return {
    problems,
    machineCaught: {
      percent: classes.size === 0 ? null : Math.round((enforcedCount / classes.size) * 100),
      enforced: enforcedCount,
      classes: classes.size,
    },
    repeats,
    suppressions,
    textRows: rows.filter((row) => row.status === "text").map((row) => row.id),
    twiceWithoutEnforcement,
  };
}

export function formatReport(report: SelfReport): string {
  const caught =
    report.machineCaught.percent === null
      ? `machine-caught: n/a (${report.machineCaught.enforced}/${report.machineCaught.classes})`
      : `machine-caught: ${report.machineCaught.percent}% (${report.machineCaught.enforced}/${report.machineCaught.classes})`;
  const baseline = report.suppressions.baselineTotal === null ? "baseline missing" : `baseline ${report.suppressions.baselineTotal}`;
  const baselineUn =
    report.suppressions.baselineUnannotated === null ? "baseline missing" : `baseline ${report.suppressions.baselineUnannotated}`;
  return [
    caught,
    `repeats: ${report.repeats}`,
    `suppressions: total ${report.suppressions.total} (${baseline}), unannotated ${report.suppressions.unannotated} (${baselineUn})`,
    `text: ${report.textRows.length > 0 ? report.textRows.join(", ") : "none"}`,
    `seen twice without enforcement: ${report.twiceWithoutEnforcement.length > 0 ? report.twiceWithoutEnforcement.join(", ") : "none"}`,
  ].join("\n");
}

function readRules(root: string, problems: string[]): { tier: "T0" | "T1"; rows: RuleRow[] } | null {
  const text = readText(root, AGENTS_PATH);
  if (text === null) {
    problems.push(`${AGENTS_PATH} is missing.`);
    return null;
  }
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "## Rule table");
  if (start < 0) {
    problems.push(`${AGENTS_PATH} has no "## Rule table" section.`);
    return null;
  }
  let index = start + 1;
  while (index < lines.length && lines[index]?.trim() === "") index += 1;
  const tierLine = lines[index]?.trim() ?? "";
  const tier = /^Tier: (T0|T1)$/.exec(tierLine)?.[1];
  if (tier !== "T0" && tier !== "T1") {
    problems.push('rule table has no "Tier: T0" or "Tier: T1" line.');
    return null;
  }
  index += 1;
  while (index < lines.length && lines[index]?.trim() === "") index += 1;
  const header = cells(lines[index] ?? "");
  if (!header || header.join("\t") !== COLUMNS.join("\t")) {
    problems.push("rule table header must be | ID | Rule | Enforcer | Evidence | Status |.");
    return null;
  }
  index += 1;
  const separator = cells(lines[index] ?? "");
  if (!separator || separator.length !== COLUMNS.length || separator.some((cell) => !/^:?-+:?$/.test(cell))) {
    problems.push("rule table header has no separator row.");
    return null;
  }
  index += 1;
  const rows: RuleRow[] = [];
  const seen = new Set<string>();
  const scripts = packageScripts(root);
  for (; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line.trim().startsWith("|")) break;
    const row = cells(line);
    const where = `rule table row ${rows.length + 1}`;
    if (!row || row.length !== COLUMNS.length) {
      problems.push(`${where} has ${row?.length ?? 0} cells, not 5.`);
      continue;
    }
    const [id = "", rule = "", enforcer = "", evidence = "", status = ""] = row;
    if (!isKebab(id)) problems.push(`${where} id "${id}" is not kebab-case.`);
    else if (seen.has(id)) problems.push(`${where} id "${id}" is duplicated.`);
    else seen.add(id);
    if (rule === "") problems.push(`${where} rule is empty.`);
    if (!STATUSES.has(status)) problems.push(`${where} status "${status}" is not enforced, text or retired.`);
    if (!validRef(evidence)) problems.push(`${where} evidence "${evidence}" is not a pull request, commit or tounsoo link.`);
    const parsed = parseEnforcer(enforcer);
    if ("problem" in parsed) {
      problems.push(`${where} ${parsed.problem}`);
      continue;
    }
    if (status === "text" && !parsed.text) problems.push(`${where} status is text but the enforcer is not text.`);
    if (status === "enforced" && parsed.text) problems.push(`${where} status is enforced but the enforcer is text.`);
    if ((status === "enforced" || status === "retired") && !parsed.text) {
      for (const token of parsed.machine) {
        if (!enforcerResolves(root, token, scripts)) problems.push(`${where} enforcer \`${token}\` does not resolve.`);
      }
    }
    if (status === "retired" && parsed.text && parsed.machine.length > 0) {
      problems.push(`${where} status and enforcer disagree.`);
    }
    rows.push({ id, enforcer, evidence, status });
  }
  return { tier, rows };
}

function readWeeds(root: string, problems: string[]): WeedRow[] {
  const text = readText(root, WEEDS_PATH);
  if (text === null) {
    problems.push(`${WEEDS_PATH} is missing.`);
    return [];
  }
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  if (lines[0] !== WEEDS_HEADER) {
    problems.push(`${WEEDS_PATH} header must be date, class, ref, caught_by and note, separated by tabs.`);
    return [];
  }
  const rows: WeedRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const fields = line.split("\t");
    const where = `weeds row ${index + 1}`;
    if (fields.length !== 5) {
      problems.push(`${where} has ${fields.length} fields, not 5.`);
      continue;
    }
    const [date = "", className = "", ref = "", caughtBy = "", note = ""] = fields;
    if (!isRealDate(date)) problems.push(`${where} date "${date}" is not YYYY-MM-DD.`);
    if (!isKebab(className)) problems.push(`${where} class "${className}" is not kebab-case.`);
    if (!validRef(ref)) problems.push(`${where} ref "${ref}" is not a pull request, commit or tounsoo link.`);
    if (!CAUGHT_BY.has(caughtBy)) problems.push(`${where} caught_by "${caughtBy}" is not review, ben, prod or revert.`);
    if (note.trim() === "") problems.push(`${where} note is empty.`);
    rows.push({ date, className });
  }
  return rows;
}

function readSuppressions(
  root: string,
  problems: string[],
  today: string,
): SelfReport["suppressions"] {
  const baseline = readBaseline(root, problems);
  let total = 0;
  let unannotated = 0;
  for (const file of sourceFiles(root)) {
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const comment = commentBody(lines[index] ?? "");
      if (comment === null || !MARKERS.some((marker) => comment.includes(marker))) continue;
      total += 1;
      const where = `${path.relative(root, file).split(path.sep).join("/")}:${index + 1}`;
      if (!/why:|expires:|approved:/.test(comment)) {
        unannotated += 1;
        continue;
      }
      const reason = /why:\s*([^;]*)/.exec(comment)?.[1]?.trim() ?? "";
      if (reason === "") problems.push(`${where}: annotated suppression has no reason.`);
      const expires = /expires:\s*(\d{4}-\d{2}-\d{2})\b/.exec(comment)?.[1] ?? "";
      if (!isRealDate(expires)) problems.push(`${where}: annotated suppression has no expiry.`);
      else if (expires < today) problems.push(`${where}: annotated suppression expired on ${expires}.`);
      else if (expires > addDays(today, 90)) problems.push(`${where}: annotated suppression expires ${expires}, more than 90 days out.`);
      const approved = /approved:\s*(\S+)/.exec(comment)?.[1] ?? "";
      if (!validRef(approved)) problems.push(`${where}: annotated suppression has no approval.`);
    }
  }
  if (baseline) {
    if (total > baseline.total) problems.push(`suppressions: total ${total} is above the baseline ${baseline.total}.`);
    if (unannotated > baseline.unannotated) {
      problems.push(`suppressions: unannotated ${unannotated} is above the baseline ${baseline.unannotated}.`);
    }
  }
  return {
    total,
    unannotated,
    baselineTotal: baseline?.total ?? null,
    baselineUnannotated: baseline?.unannotated ?? null,
  };
}

function readBaseline(root: string, problems: string[]): { total: number; unannotated: number } | null {
  const text = readText(root, BASELINE_PATH);
  if (text === null) {
    problems.push(`${BASELINE_PATH} is missing.`);
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    problems.push(`${BASELINE_PATH} is not JSON.`);
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    problems.push(`${BASELINE_PATH} must be an object with total and unannotated.`);
    return null;
  }
  const record = parsed as { total?: unknown; unannotated?: unknown };
  const total = countField(record.total);
  const unannotated = countField(record.unannotated);
  if (total === null) problems.push(`${BASELINE_PATH} "total" must be a non-negative integer.`);
  if (unannotated === null) problems.push(`${BASELINE_PATH} "unannotated" must be a non-negative integer.`);
  if (total === null || unannotated === null) return null;
  return { total, unannotated };
}

function sourceFiles(root: string): string[] {
  const found: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).split(path.sep).join("/");
      if (rel === ".agents/pstack" || rel.startsWith(".agents/pstack/") || rel.endsWith("routeTree.gen.ts")) continue;
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && SOURCE_EXT.has(path.extname(entry.name))) found.push(full);
    }
  };
  visit(root);
  return found;
}

function commentBody(line: string): string | null {
  const stripped = line.replace(/`(?:\\.|[^`\\])*`/g, '""').replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/'(?:\\.|[^'\\])*'/g, "''");
  const slash = stripped.indexOf("//");
  const block = stripped.indexOf("/*");
  const start = slash < 0 ? block : block < 0 ? slash : Math.min(slash, block);
  if (start < 0) return null;
  return stripped.slice(start);
}

function parseEnforcer(cell: string): { text: boolean; machine: string[] } | { problem: string } {
  const machine = [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "").filter((token) => token !== "");
  const leftover = cell.replace(/`[^`]*`/g, "").replace(/[,\s]/g, "");
  if (machine.length === 0) {
    if (cell.trim() === "text") return { text: true, machine: [] };
    return { problem: "enforcer is empty." };
  }
  if (machine.length === 1 && machine[0] === "text" && leftover === "") return { text: true, machine: [] };
  if (machine.includes("text") || leftover !== "") return { problem: "status and enforcer disagree." };
  return { text: false, machine };
}

function enforcerResolves(root: string, token: string, scripts: Readonly<Record<string, string>> | null): boolean {
  const npm = /^npm run ([\w:-]+)$/.exec(token);
  if (npm) return scripts?.[npm[1] ?? ""] !== undefined;
  const pnpm = /^pnpm ([\w:-]+)$/.exec(token);
  if (pnpm) return scripts?.[pnpm[1] ?? ""] !== undefined;
  const script = /^script:([\w:-]+)$/.exec(token);
  if (script) return scripts?.[script[1] ?? ""] !== undefined;
  const eslint = /^eslint:(.+)$/.exec(token);
  if (eslint) return eslintRuleNamed(root, eslint[1] ?? "");
  const tsconfig = /^tsconfig:(.+)$/.exec(token);
  if (tsconfig) return tsconfigOption(root, tsconfig[1] ?? "");
  const file = token.split("#")[0] ?? "";
  if (file === "" || path.isAbsolute(file)) return false;
  const full = path.resolve(root, file);
  const rootFull = path.resolve(root);
  if (full !== rootFull && !full.startsWith(rootFull + path.sep)) return false;
  return existsSync(full);
}

function packageScripts(root: string): Record<string, string> | null {
  const text = readText(root, "package.json");
  if (text === null) return null;
  try {
    const parsed = JSON.parse(text) as { scripts?: Record<string, string> };
    return parsed.scripts ?? {};
  } catch {
    return null;
  }
}

function eslintRuleNamed(root: string, rule: string): boolean {
  const names = ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts", ".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json"];
  const quoted = [`"${rule}"`, `'${rule}'`];
  return names.some((name) => {
    const text = readText(root, name);
    return text !== null && quoted.some((needle) => text.includes(needle));
  });
}

function tsconfigOption(root: string, option: string): boolean {
  return tsconfigFiles(root).some((file) => {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as { compilerOptions?: Record<string, unknown> };
      return parsed.compilerOptions?.[option] === true;
    } catch {
      return false;
    }
  });
}

function tsconfigFiles(root: string): string[] {
  const found: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && /^tsconfig.*\.json$/.test(entry.name)) found.push(full);
    }
  };
  visit(root);
  return found;
}

function cells(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  const parts = trimmed.split("|").slice(1, -1).map((cell) => cell.trim());
  return parts.length > 0 ? parts : null;
}

function validRef(value: string): boolean {
  return /^#\d+$/.test(value) || /^[0-9a-f]{7,40}$/i.test(value) || /^https:\/\/github\.com\/tounsoo\/\S+$/.test(value);
}

function isKebab(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = new Date(Date.UTC(Number(match?.[1] ?? 1970), Number(match?.[2] ?? 1) - 1, Number(match?.[3] ?? 1)));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function countField(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function readText(root: string, rel: string): string | null {
  const full = path.join(root, rel);
  if (!existsSync(full) || !statSync(full).isFile()) return null;
  return readFileSync(full, "utf8");
}
