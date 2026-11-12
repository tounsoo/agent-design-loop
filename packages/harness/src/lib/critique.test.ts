import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import designLoop from "../../design-loop";
import { CRITIQUE_HEADING, critiqueBrief, critiqueMarkdown, critiquePullRequestMarkdown, critiqueTrace, galleryShots, MAX_REVISE_ROUNDS, parseCritique, PATTERNS, reviseRounds, verdict, type Critique, type Finding } from "./critique";

const shots = { before: ["before/ready--page-detail.png"], after: ["after/ready--page-detail.png", "after/approved--page-detail.png"] };

const finding = (over: Partial<Finding> = {}): Finding => ({
  pattern: "hierarchy",
  severity: "revise",
  screenshots: ["after/ready--page-detail.png"],
  problem: "The section headings are nearly as large as the title.",
  fix: "Draw section headings a step smaller.",
  ...over,
});

const answer = (critique: object): string => JSON.stringify(critique);

describe("critiqueBrief", () => {
  const brief = critiqueBrief({
    product: { config: "products/x/harness.config.ts", tasks: [{ id: "approve", description: "Approve an invoice" }], priority: [{ action: "Request changes", rank: 2, level: "secondary" }, { action: "Approve", rank: 1, level: "primary" }] },
    gallery: "products/x/review/screenshots/change",
    shots,
  });

  it("names every screenshot, the ranked actions in order, and every pattern", () => {
    for (const file of [...shots.after, ...shots.before]) expect(brief).toContain(`\`${file}\``);
    expect(brief.indexOf("Rank 1 action, primary: Approve.")).toBeLessThan(brief.indexOf("Rank 2 action, secondary: Request changes."));
    for (const pattern of PATTERNS) expect(brief).toContain(`(\`${pattern.id}\`)`);
    expect(brief).toContain("Task `approve`: Approve an invoice.");
  });

  it("asks for relationships, never counts", () => {
    expect(brief).toContain("don't count sections, fields, headings or pixels");
  });
});

describe("parseCritique", () => {
  it("reads a critique, bare or in a fenced json block", () => {
    const critique = { reviewer: "a model", findings: [finding()] };
    expect(parseCritique(answer(critique), shots)).toEqual({ critique });
    expect(parseCritique(`Here it is:\n\n\`\`\`json\n${JSON.stringify(critique, null, 2)}\n\`\`\`\n`, shots)).toEqual({ critique });
 
    expect(parseCritique(`\uFEFF${answer(critique)}`, shots)).toEqual({ critique });
    expect(parseCritique(`I looked at:\n\n\`\`\`text\nafter/ready--page-detail.png\n\`\`\`\n\n\`\`\`json\n${answer(critique)}\n\`\`\`\n`, shots)).toEqual({ critique });
  });

  it("reads a critique with no findings", () => {
    expect(parseCritique(answer({ reviewer: "a model", findings: [] }), shots)).toEqual({ critique: { reviewer: "a model", findings: [] } });
  });

  it("fails an answer that is not JSON", () => {
    expect(parseCritique("Looks fine to me.", shots)).toEqual({ problems: ["the findings are not JSON. Give the critic's answer, one JSON object as the brief shows."] });
  });

  it("fails a finding with an unknown pattern, a severity that is not revise or note, or a screenshot the change does not show", () => {
    const result = parseCritique(
      answer({ reviewer: "a model", findings: [finding({ pattern: "sections" as Finding["pattern"], severity: "blocker" as Finding["severity"], screenshots: ["before/ready--page-detail.png"] })] }),
      shots,
    );
    expect("problems" in result && result.problems).toEqual([
      'finding 1 has pattern "sections". A pattern is one of hierarchy, primary-action, grouping, crowding.',
      'finding 1 has severity "blocker". A severity is revise or note.',
      "finding 1 names before/ready--page-detail.png, which is not a screenshot the change shows. It shows after/ready--page-detail.png, after/approved--page-detail.png.",
    ]);
  });

  it("fails a critique with no reviewer, an unknown key, or a finding with no problem, fix or screenshots", () => {
    const result = parseCritique(answer({ findings: [{ pattern: "crowding", severity: "note", screenshots: [], problem: " ", fix: "", where: "top" }], score: 3 }), shots);
    expect("problems" in result && result.problems).toEqual([
      "the findings have unknown keys: score. They have reviewer and findings.",
      "the findings name no reviewer: the critic's model.",
      "finding 1 has unknown keys: where.",
      "finding 1 names no screenshots.",
      "finding 1 has no problem.",
      "finding 1 has no fix.",
    ]);
  });
});

describe("reviseRounds and verdict", () => {
  const step = (node: string, when?: string): string => JSON.stringify(when ? { node, when } : { node });
  const trace = (...steps: string[]): string => `${steps.join("\n")}\n`;

  it("counts the run's critique steps that took revise, from its last start", () => {
    const first = [{ node: "read" }, { node: "critique", when: "revise" }, { node: "critique", when: "revise" }, { node: "pull-request" }];
    expect(reviseRounds(first, "read")).toBe(2);
    expect(reviseRounds([...first, { node: "read" }, { node: "critique", when: "revise" }, { node: "critique", when: "pass" }], "read")).toBe(1);
  });

  // The walk from read to the screenshots, as the real graph has it.
  const toScreenshots = [step("read"), step("route", "fits"), step("build"), step("checks", "pass"), step("screenshots")];
  const again = [step("build"), step("checks", "pass"), step("screenshots")];

  it("reads the rounds from a trace that stands at screenshots", () => {
    expect(critiqueTrace(designLoop, trace(...toScreenshots))).toEqual({ rounds: 0 });
    expect(critiqueTrace(designLoop, trace(...toScreenshots, step("critique", "revise"), ...again))).toEqual({ rounds: 1 });
    expect(critiqueTrace(designLoop, trace(...toScreenshots, step("critique", "revise"), ...again, step("critique", "revise"), ...again))).toEqual({ rounds: 2 });
  });

  it("refuses a trace that does not parse, breaks the graph, or does not stand at screenshots", () => {
    expect(critiqueTrace(designLoop, "not json\n")).toHaveProperty("problems");
    expect(critiqueTrace(designLoop, trace(step("read"), step("screenshots")))).toHaveProperty("problems");
    const recorded = critiqueTrace(designLoop, trace(...toScreenshots, step("critique", "revise")));
    expect(recorded).toEqual({ problems: [expect.stringContaining("last step is critique")] });
  });

  it("revises while a finding calls for it and rounds are left, then passes and leaves it open", () => {
    const critique: Critique = { reviewer: "a model", findings: [finding(), finding({ severity: "note", pattern: "grouping" })] };
    expect(verdict(critique, 0)).toEqual({ when: "revise", round: 1, leftOpen: [] });
    expect(verdict(critique, MAX_REVISE_ROUNDS - 1).when).toBe("revise");
    expect(verdict(critique, MAX_REVISE_ROUNDS)).toEqual({ when: "pass", round: MAX_REVISE_ROUNDS + 1, leftOpen: [finding()] });
    expect(verdict({ reviewer: "a model", findings: [finding({ severity: "note" })] }, 0)).toEqual({ when: "pass", round: 1, leftOpen: [] });
  });
});

describe("critiqueMarkdown and critiquePullRequestMarkdown", () => {
  const critique: Critique = { reviewer: "a model", findings: [finding(), finding({ severity: "note", pattern: "grouping", problem: "Amenities sits apart from Room details.", fix: "Move it under Room details." })] };

  it("writes a CRITIQUE.md the screenshots step recognizes, with each finding under its severity", () => {
    const markdown = critiqueMarkdown(critique, verdict(critique, 0));
    expect(markdown.startsWith(`${CRITIQUE_HEADING}\n`)).toBe(true);
    expect(markdown).toContain("Round 1, by a model, which did not build the change: revise, with 1 to fix before review, 1 for the review note.");
    expect(markdown).toContain("## Fix before review\n\n- **Hierarchy** (`after/ready--page-detail.png`): The section headings are nearly as large as the title. Fix: Draw section headings a step smaller.");
    expect(markdown).toContain("## For the review note\n\n- **Grouping**");
  });

  it("says when the rounds are spent", () => {
    const markdown = critiqueMarkdown(critique, verdict(critique, MAX_REVISE_ROUNDS));
    expect(markdown).toContain("pass, with 1 to fix before review, 1 for the review note, and the 2 rounds of revision are spent, so the one left open goes in the review note.");
    expect(markdown).toContain("## Left open after the last round");
  });

  it("writes one line per finding for the pull request, and a line alone with none", () => {
    expect(critiquePullRequestMarkdown(critique, verdict(critique, 0)).split("\n")).toHaveLength(4);
    expect(critiquePullRequestMarkdown({ reviewer: "a model", findings: [] }, verdict({ reviewer: "a model", findings: [] }, 0))).toBe("**Critique** (round 1, by a model): pass, with no findings.");
  });
});

describe("galleryShots", () => {
  const png = (dir: string, ...files: string[]): void => {
    mkdirSync(dir, { recursive: true });
    for (const file of files) writeFileSync(path.join(dir, file), "");
  };

  it("reads before/ and after/ when the gallery has a base, and its own PNGs otherwise", () => {
    const withBase = mkdtempSync(path.join(os.tmpdir(), "critique-"));
    png(path.join(withBase, "before"), "b.png");
    png(path.join(withBase, "after"), "b.png", "a.png");
    writeFileSync(path.join(withBase, "README.md"), "# Screenshots\n");
    expect(galleryShots(withBase)).toEqual({ before: ["before/b.png"], after: ["after/a.png", "after/b.png"] });

    const flat = mkdtempSync(path.join(os.tmpdir(), "critique-"));
    png(flat, "ready.png", "notes.txt");
    expect(galleryShots(flat)).toEqual({ before: [], after: ["ready.png"] });
  });
});
