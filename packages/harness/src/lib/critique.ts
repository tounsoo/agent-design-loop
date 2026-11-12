import { parseTrace } from "./trace";

/**
 * The design loop's critique step. Once the screenshots are taken, a second
 * model, not the one that built the change, looks at the gallery and judges
 * each page against patterns that hold on any page: hierarchy, where the
 * primary action sits, grouping and crowding. It judges relationships and
 * weight, never counts: a long page in good order passes, and a short page
 * where everything shouts does not.
 *
 * The harness makes no model call. `npm run critique` writes the brief the
 * agent gives its critic, then reads the critic's findings back, writes them
 * into the gallery as CRITIQUE.md and says which edge the loop takes. The
 * critique is advisory: no check reads it, and the build gate does not run it.
 */

/** The first line of the CRITIQUE.md the critique writes into a gallery. `npm run screenshots` keeps a gallery that holds it. */
export const CRITIQUE_HEADING = "# Critique";

/** The file the critique writes into the gallery folder. */
export const CRITIQUE_FILE = "CRITIQUE.md";

/** How many times the critique may send a change back to build. The next critique routes on to the review note, with what is left. */
export const MAX_REVISE_ROUNDS = 2;

export type PatternId = "hierarchy" | "primary-action" | "grouping" | "crowding";

export type Pattern = {
  readonly id: PatternId;
  readonly name: string;
  /** The questions the critic answers for every screenshot. */
  readonly asks: readonly string[];
};

/** The rubric. Each pattern holds on every page, whatever its type, so no page or page type sets a number of its own. */
export const PATTERNS: readonly Pattern[] = [
  {
    id: "hierarchy",
    name: "Hierarchy",
    asks: [
      "Is the page's title the strongest thing on it, and does the eye go next to what the page is for?",
      "Do section headings read as clearly below the title, or does the page look like several blocks of equal rank?",
      "Does each element's weight (size, boldness, color, a filled background) match how much it matters to the page's job?",
    ],
  },
  {
    id: "primary-action",
    name: "Primary action",
    asks: [
      "Is there one action that reads as the main one, and is it the product's rank-1 action?",
      "Can a person see it without scrolling, and does it sit next to what it acts on?",
      "Does anything compete with it for attention, such as a second strong button, a bright badge or a link that looks like a button?",
      "On a page that lists records or only shows information, no action needs to lead: does one still try to?",
    ],
  },
  {
    id: "grouping",
    name: "Grouping",
    asks: [
      "Are related things together and unrelated things visibly apart, with spacing that shows which is which?",
      "Does each block sit where its meaning puts it: a fact beside the question it bears on, a detail beside the thing it describes?",
      "Does the page show the same information twice?",
    ],
  },
  {
    id: "crowding",
    name: "Crowding",
    asks: [
      "Does the page ask for attention on more things than its job needs?",
      "Is secondary content visibly quieter than the main content, or behind a disclosure, rather than shown at full weight?",
      "Does a state look busier than the others without a reason in that state?",
    ],
  },
];

export type Severity = "revise" | "note";

export type Finding = {
  readonly pattern: PatternId;
  readonly severity: Severity;
  /** The gallery's PNGs it applies to, as the brief names them, such as `after/ready--page-detail.png`. */
  readonly screenshots: readonly string[];
  /** What is wrong and where on the page, in a sentence or two. */
  readonly problem: string;
  /** The change that would fix it, in terms of the page's own parts. */
  readonly fix: string;
};

export type Critique = {
  /** The model that wrote the critique, which is not the one that built the change. */
  readonly reviewer: string;
  readonly findings: readonly Finding[];
};

/** The PNGs a gallery holds: `after/` and `before/` with a base, or the folder's own without one. */
export type Shots = { readonly before: readonly string[]; readonly after: readonly string[] };

const SEVERITIES: readonly Severity[] = ["revise", "note"];
const FINDING_KEYS = new Set(["pattern", "severity", "screenshots", "problem", "fix"]);
const CRITIQUE_KEYS = new Set(["reviewer", "findings"]);

/** What the product tells the critic about itself, from its inputs. */
export type ProductContext = {
  /** The product's config, such as products/nook/harness.config.ts. */
  readonly config: string;
  readonly tasks: readonly { readonly id: string; readonly description?: string }[];
  readonly priority: readonly { readonly action: string; readonly rank: number; readonly level: string }[];
};

/** The brief the agent hands its critic: the product, the screenshots, the rubric and the answer's shape. */
export function critiqueBrief({ product, gallery, shots }: { readonly product: ProductContext; readonly gallery: string; readonly shots: Shots }): string {
  const ranked = [...product.priority].sort((a, b) => a.rank - b.rank);
  const lines = [
    "# Design critique brief",
    "",
    "You are the design critic for one change to a product's UI. You did not build it. Judge only what the screenshots show, the way a designer would on a first look, and say what a person using the page would get wrong or have to work for.",
    "",
    "## The product",
    "",
    `The config is \`${product.config}\`.`,
    "",
    ...product.tasks.map((task) => `- Task \`${task.id}\`${task.description ? `: ${task.description}` : ""}.`),
    ...ranked.map((entry) => `- Rank ${entry.rank} action, ${entry.level}: ${entry.action}.`),
    "",
    "## The screenshots",
    "",
    `Each is a full page at 1280 CSS px wide, one per preview, in \`${gallery}\`. A name is the preview's state, then any other part of its address. Open every one.`,
    "",
    ...(shots.before.length > 0
      ? ["Judge the `after/` screenshots. The `before/` ones are the base, for comparison only: a problem already there counts only when the change makes it worse.", ""]
      : []),
    ...shots.after.map((file) => `- \`${file}\``),
    ...(shots.before.length > 0 ? ["", "For comparison:", "", ...shots.before.map((file) => `- \`${file}\``)] : []),
    "",
    "## The rubric",
    "",
    "Answer each question for each page. Judge relationships and weight, never numbers: don't count sections, fields, headings or pixels, and don't set a limit for any of them. A long page in good order passes, and a short page where everything shouts does not.",
    "",
    ...PATTERNS.flatMap((pattern) => [`### ${pattern.name} (\`${pattern.id}\`)`, "", ...pattern.asks.map((ask) => `- ${ask}`), ""]),
    "## Severity",
    "",
    "A finding is `revise` when the change breaks one of the four patterns, and `note` otherwise. The builder fixes every `revise` before review, so use it for these, and only these:",
    "",
    "- **Hierarchy:** a heading or block the change shows draws about as much weight as the page title, or more than the content the page is for, so the page reads as blocks of equal rank.",
    "- **Primary action:** the rank-1 action is out of the first view, covered by something, or not the strongest action on the page, on a page that has one.",
    "- **Grouping:** the change puts something apart from the thing it belongs to, or shows the same information twice.",
    "- **Crowding:** the change shows secondary content at the same weight as the main content, where it could be quieter or behind a disclosure.",
    "",
    "Everything else is `note`: polish, taste, spacing and alignment that don't change how the page reads, and any problem the `before/` screenshots already have that the change doesn't make worse. A `note` goes in the review note.",
    "",
    "Report a problem once, with every screenshot it shows in. Leave out praise and anything the screenshots don't show, such as code, copy you can't read or how the page behaves when pressed.",
    "",
    "## Your answer",
    "",
    "Answer with one JSON object and nothing else:",
    "",
    "```json",
    JSON.stringify(
      {
        reviewer: "<your model's name>",
        findings: [
          {
            pattern: PATTERNS.map((pattern) => pattern.id).join(" | "),
            severity: "revise | note",
            screenshots: [shots.after[0] ?? "<screenshot>"],
            problem: "What is wrong and where on the page.",
            fix: "The change that would fix it, in the page's own terms.",
          },
        ],
      },
      null,
      2,
    ),
    "```",
    "",
    'With nothing to report, answer with `"findings": []`.',
    "",
  ];
  return lines.join("\n");
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

/**
 * The critic's answer, read and checked against the gallery. A JSON object,
 * alone or in one fenced json block. Every screenshot a finding names must be
 * one of the gallery's `after` shots, so a finding cannot point at a page the
 * change did not show.
 */
export function parseCritique(input: string, shots: Shots): { critique: Critique } | { problems: string[] } {
  const fenced = /```(?:json)?\s*\n([\s\S]*?)\n```/.exec(input);
  let value: unknown;
  try {
    value = JSON.parse(fenced?.[1] ?? input);
  } catch {
    return { problems: ["the findings are not JSON. Give the critic's answer, one JSON object as the brief shows."] };
  }
  if (!isRecord(value)) return { problems: ["the findings are not a JSON object."] };
  const problems: string[] = [];
  const unknownKeys = Object.keys(value).filter((key) => !CRITIQUE_KEYS.has(key));
  if (unknownKeys.length > 0) problems.push(`the findings have unknown keys: ${unknownKeys.join(", ")}. They have reviewer and findings.`);
  if (!text(value.reviewer)) problems.push("the findings name no reviewer: the critic's model.");
  if (!Array.isArray(value.findings)) return { problems: [...problems, "the findings have no findings list. With nothing to report it is []."] };
  const patternIds = PATTERNS.map((pattern) => pattern.id);
  const findings: Finding[] = [];
  value.findings.forEach((item: unknown, index) => {
    const at = `finding ${index + 1}`;
    if (!isRecord(item)) {
      problems.push(`${at} is not a JSON object.`);
      return;
    }
    const extra = Object.keys(item).filter((key) => !FINDING_KEYS.has(key));
    if (extra.length > 0) problems.push(`${at} has unknown keys: ${extra.join(", ")}.`);
    const { pattern, severity, screenshots, problem, fix } = item;
    if (!patternIds.includes(pattern as PatternId)) problems.push(`${at} has pattern ${JSON.stringify(pattern)}. A pattern is one of ${patternIds.join(", ")}.`);
    if (!SEVERITIES.includes(severity as Severity)) problems.push(`${at} has severity ${JSON.stringify(severity)}. A severity is revise or note.`);
    if (!Array.isArray(screenshots) || screenshots.length === 0 || !screenshots.every(text)) {
      problems.push(`${at} names no screenshots.`);
    } else {
      const missing = screenshots.filter((file) => !shots.after.includes(file));
      if (missing.length > 0) problems.push(`${at} names ${missing.join(", ")}, which ${missing.length === 1 ? "is not a screenshot" : "are not screenshots"} the change shows. It shows ${shots.after.join(", ")}.`);
    }
    if (!text(problem)) problems.push(`${at} has no problem.`);
    if (!text(fix)) problems.push(`${at} has no fix.`);
    if (text(problem) && text(fix) && Array.isArray(screenshots)) {
      findings.push({ pattern: pattern as PatternId, severity: severity as Severity, screenshots: screenshots as string[], problem: problem.trim(), fix: fix.trim() });
    }
  });
  if (problems.length > 0) return { problems };
  return { critique: { reviewer: (value.reviewer as string).trim(), findings } };
}

/**
 * How many times the critique has already sent the trace's current run back
 * to build: its `critique` steps that took `revise` since the run's last
 * start. A trace that does not parse counts none.
 */
export function reviseRounds(trace: string, start: string): number {
  const parsed = parseTrace(trace);
  if ("problems" in parsed) return 0;
  let rounds = 0;
  for (const step of parsed.steps) {
    if (step.node === start) rounds = 0;
    else if (step.node === "critique" && step.when === "revise") rounds += 1;
  }
  return rounds;
}

export type Verdict = {
  /** The edge out of the loop's critique node. */
  readonly when: "revise" | "pass";
  /** Which critique of this run it is, from 1. */
  readonly round: number;
  /** The findings that call for a revision, which this round leaves open because the rounds are spent. */
  readonly leftOpen: readonly Finding[];
};

/** Revise while a finding calls for it and rounds are left; otherwise pass, and what is left goes in the review note. */
export function verdict(critique: Critique, rounds: number): Verdict {
  const revise = critique.findings.filter((finding) => finding.severity === "revise");
  const spent = rounds >= MAX_REVISE_ROUNDS;
  return { when: revise.length > 0 && !spent ? "revise" : "pass", round: rounds + 1, leftOpen: spent ? revise : [] };
}

const patternName = (id: PatternId): string => PATTERNS.find((pattern) => pattern.id === id)?.name ?? id;
const line = (finding: Finding): string => `- **${patternName(finding.pattern)}** (${finding.screenshots.map((file) => `\`${file}\``).join(", ")}): ${finding.problem} Fix: ${finding.fix}`;

function outcome(critique: Critique, result: Verdict): string {
  const revise = critique.findings.filter((finding) => finding.severity === "revise").length;
  const note = critique.findings.length - revise;
  const counts = critique.findings.length === 0 ? "no findings" : [revise > 0 ? `${revise} to fix before review` : "", note > 0 ? `${note} for the review note` : ""].filter(Boolean).join(", ");
  const spent = result.leftOpen.length > 0 ? `, and the ${MAX_REVISE_ROUNDS} rounds of revision are spent, so the ${result.leftOpen.length === 1 ? "one left open goes" : `${result.leftOpen.length} left open go`} in the review note` : "";
  return `${result.when}, with ${counts}${spent}`;
}

/** The CRITIQUE.md the critique writes into the gallery. */
export function critiqueMarkdown(critique: Critique, result: Verdict): string {
  const revise = critique.findings.filter((finding) => finding.severity === "revise");
  const note = critique.findings.filter((finding) => finding.severity === "note");
  const lines = [
    CRITIQUE_HEADING,
    "",
    `Round ${result.round}, by ${critique.reviewer}, which did not build the change: ${outcome(critique, result)}. Written by \`npm run critique\` from the critic's findings on this folder's screenshots. It is advisory: no check reads it.`,
    "",
  ];
  if (revise.length > 0) lines.push(result.leftOpen.length > 0 ? "## Left open after the last round" : "## Fix before review", "", ...revise.map(line), "");
  if (note.length > 0) lines.push("## For the review note", "", ...note.map(line), "");
  if (critique.findings.length === 0) lines.push("The critic found nothing to fix or note.", "");
  return lines.join("\n");
}

/** The block the pull request description carries: the outcome and every finding, one line each. */
export function critiquePullRequestMarkdown(critique: Critique, result: Verdict): string {
  return [`**Critique** (round ${result.round}, by ${critique.reviewer}): ${outcome(critique, result)}.`, ...(critique.findings.length > 0 ? ["", ...critique.findings.map((finding) => `${line(finding)} *(${finding.severity})*`)] : [])].join("\n");
}
