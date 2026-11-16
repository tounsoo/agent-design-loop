import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { checkRepository, formatReport } from "./self-correcting";

const NOW = new Date("2026-11-16T12:00:00.000Z");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const dirs: string[] = [];

function lineComment(body: string): string {
  return ["//", body].join(" ");
}

function eslintNext(rest: string): string {
  return ["eslint-", "disable-next-line ", rest].join("");
}

function tempRepo(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "self-"));
  dirs.push(dir);
  for (const [name, text] of Object.entries(files)) {
    const full = path.join(dir, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return dir;
}

function validFiles(): Record<string, string> {
  return {
    "package.json": `${JSON.stringify({ scripts: { "check:sample": "node -e 0" } })}\n`,
    "AGENTS.md": [
      "## Rule table",
      "",
      "Tier: T0",
      "",
      "| ID | Rule | Enforcer | Evidence | Status |",
      "| --- | --- | --- | --- | --- |",
      "| sample-rule | The sample check passes. | `npm run check:sample` | #1 | enforced |",
      "",
    ].join("\n"),
    ".agents/weeds.tsv": "date\tclass\tref\tcaught_by\tnote\n2026-11-01\tother-class\t#2\treview\tA review found it.\n",
    ".agents/suppression-baseline.json": '{"total":0,"unannotated":0}\n',
    "src/mention.ts": `const label = ${JSON.stringify(lineComment(eslintNext("no-console")))};\n`,
  };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("checkRepository", () => {
  it("passes a well-formed repository and prints the machine-caught share", () => {
    const report = checkRepository(tempRepo(validFiles()), NOW);
    expect(report.problems).toEqual([]);
    expect(formatReport(report)).toContain("machine-caught: 50% (1/2)");
  });

  it("fails a malformed rule table", () => {
    const files = validFiles();
    const dir = tempRepo(files);
    expect(checkRepository(dir, NOW).problems).toEqual([]);
    files["AGENTS.md"] = ["## Rule table", "", "Tier: T0", "", "| ID | Rule | Enforcer | Status |", "| --- | --- | --- | --- |", ""].join("\n");
    writeFileSync(path.join(dir, "AGENTS.md"), files["AGENTS.md"] ?? "");
    const problems = checkRepository(dir, NOW).problems;
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join("\n")).toContain("rule table header must be");
  });

  it("fails a bad weeds row", () => {
    const files = validFiles();
    const dir = tempRepo(files);
    expect(checkRepository(dir, NOW).problems).toEqual([]);
    writeFileSync(path.join(dir, ".agents/weeds.tsv"), "date\tclass\tref\tcaught_by\tnote\nnot-a-date\tBad Class\tnope\tci\t\n");
    const problems = checkRepository(dir, NOW).problems;
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join("\n")).toContain('caught_by "ci"');
  });

  it("fails a suppression over the baseline", () => {
    const files = validFiles();
    const dir = tempRepo(files);
    expect(checkRepository(dir, NOW).problems).toEqual([]);
    writeFileSync(path.join(dir, "src/loose.ts"), `${lineComment(eslintNext("no-console"))}\n`);
    const problems = checkRepository(dir, NOW).problems;
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join("\n")).toContain("total 1 is above the baseline 0");
  });

  it("fails an expired annotated suppression", () => {
    const files = validFiles();
    files[".agents/suppression-baseline.json"] = '{"total":1,"unannotated":0}\n';
    const dir = tempRepo(files);
    writeFileSync(
      path.join(dir, "src/old.ts"),
      `${lineComment(`${eslintNext("no-console")} -- why: waiting on a type; expires: 2020-01-01; approved: #9`)}\n`,
    );
    const problems = checkRepository(dir, NOW).problems;
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join("\n")).toContain("expired on 2020-01-01");
    expect(problems.join("\n")).not.toContain("above the baseline");
  });

  it("fails an annotated suppression with no reason", () => {
    const files = validFiles();
    files[".agents/suppression-baseline.json"] = '{"total":1,"unannotated":0}\n';
    const dir = tempRepo(files);
    writeFileSync(path.join(dir, "src/bare.ts"), `${lineComment(`${eslintNext("no-console")} -- why: ; expires: 2026-12-01; approved: #9`)}\n`);
    expect(checkRepository(dir, NOW).problems.join("\n")).toContain("has no reason");
  });

  it("fails an annotated suppression that expires more than 90 days out", () => {
    const files = validFiles();
    files[".agents/suppression-baseline.json"] = '{"total":1,"unannotated":0}\n';
    const dir = tempRepo(files);
    writeFileSync(
      path.join(dir, "src/far.ts"),
      `${lineComment(`${eslintNext("no-console")} -- why: a long waiver; expires: 2027-11-16; approved: #9`)}\n`,
    );
    expect(checkRepository(dir, NOW).problems.join("\n")).toContain("more than 90 days out");
  });

  it("fails a repeat of an enforced class at T1", () => {
    const files = validFiles();
    files["AGENTS.md"] = (files["AGENTS.md"] ?? "").replace("Tier: T0", "Tier: T1");
    files[".agents/weeds.tsv"] = [
      "date\tclass\tref\tcaught_by\tnote",
      "2026-11-10\tsample-rule\t#3\treview\tThe check missed it once.",
      "2026-11-12\tsample-rule\t#4\treview\tThe check missed it again.",
      "",
    ].join("\n");
    const atT1 = checkRepository(tempRepo(files), NOW);
    expect(atT1.problems.length).toBeGreaterThan(0);
    expect(atT1.problems.join("\n")).toContain('T1: enforced class "sample-rule"');

    files["AGENTS.md"] = (files["AGENTS.md"] ?? "").replace("Tier: T1", "Tier: T0");
    expect(checkRepository(tempRepo(files), NOW).problems).toEqual([]);
  });

  it("passes this repository", () => {
    const report = checkRepository(repoRoot, NOW);
    expect(report.problems).toEqual([]);
    expect(formatReport(report)).toContain("machine-caught:");
    expect(report.machineCaught.enforced).toBe(23);
    expect(report.repeats).toBe(3);
    expect(report.suppressions).toMatchObject({ total: 0, unannotated: 0, baselineTotal: 0, baselineUnannotated: 0 });
    expect(report.twiceWithoutEnforcement).toEqual(["docs-claim", "preview-scope", "review-note-claim"]);
  });
});
