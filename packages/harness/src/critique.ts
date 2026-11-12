import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import designLoop from "../design-loop";
import { config, configName, loadInputs } from "./lib/config";
import { CRITIQUE_FILE, critiqueBrief, critiqueMarkdown, critiquePullRequestMarkdown, parseCritique, reviseRounds, verdict, type Shots } from "./lib/critique";

/**
 * The design loop's `critique` step, in two runs around a model the harness
 * does not call. With `--brief` it writes the brief for the critic:
 * the product's tasks and ranked actions, the gallery's screenshots, the
 * rubric and the shape of the answer. The agent gives it to a model other
 * than the one that built the change. With `--findings` and `--trace` it reads
 * that answer back, checks it against the gallery, writes CRITIQUE.md into the
 * gallery and prints the edge the loop takes out of `critique`, with the block
 * for the pull request description.
 *
 * It is advisory. The build gate does not run it and no check reads what it
 * writes; the trace records the step and its edge.
 */

const gallery = flag("--gallery");
if (!gallery) fail("give the screenshots folder: --gallery products/<name>/review/screenshots/<change>.");
const briefFile = flag("--brief");
const findingsFile = flag("--findings");
const traceFile = flag("--trace");
if (briefFile && (findingsFile || traceFile)) fail("--brief writes the critic's brief, and --findings with --trace records its answer: give one or the other.");
if (!briefFile && !findingsFile) fail("give --brief <file> to write the critic's brief, or --findings <file> --trace traces/<change>.jsonl to record its answer.");
if (findingsFile && !traceFile) fail("--findings needs --trace traces/<change>.jsonl, which counts the rounds of revision so far.");
if (traceFile && !findingsFile) fail("--trace goes with --findings.");

const folder = path.resolve(gallery);
const readme = path.join(folder, "README.md");
if (!existsSync(readme) || !readFileSync(readme, "utf8").startsWith("# Screenshots\n")) {
  fail(`${gallery} has no gallery README.md. Run npm run screenshots with --out ${gallery} first.`);
}
const shots = galleryShots(folder);
if (shots.after.length === 0) fail(`${gallery} holds no screenshots of the change.`);

if (briefFile) {
  const inputs = await loadInputs();
  const tasks = (inputs.tasks as readonly { readonly id: string; readonly description?: unknown }[]).map((task) => ({
    id: task.id,
    ...(typeof task.description === "string" ? { description: task.description } : {}),
  }));
  writeFileSync(briefFile, critiqueBrief({ product: { config: configName, tasks, priority: inputs.priority }, gallery: folder, shots }));
  console.log(`critique: wrote the critic's brief to ${briefFile}, for ${shots.after.length} screenshot${shots.after.length === 1 ? "" : "s"} of the change. Give it to a model other than the one that built the change, save its answer, and record it with --findings and --trace.`);
  process.exit(0);
}
if (!findingsFile || !traceFile) fail("--findings needs --trace.");

if (!existsSync(findingsFile)) fail(`${findingsFile} does not exist. Save the critic's answer there first.`);
if (!existsSync(traceFile)) fail(`${traceFile} does not exist. Record the walk with npm run loop:step first.`);
const parsed = parseCritique(readFileSync(findingsFile, "utf8"), shots);
if ("problems" in parsed) fail(`${findingsFile} is not a critique of ${gallery}:\n${parsed.problems.map((problem) => `- ${problem}`).join("\n")}`);
const { critique } = parsed;
const result = verdict(critique, reviseRounds(readFileSync(traceFile, "utf8"), designLoop.start));
writeFileSync(path.join(folder, CRITIQUE_FILE), critiqueMarkdown(critique, result));

const revise = critique.findings.filter((finding) => finding.severity === "revise").length;
console.log(`critique: wrote ${relative(path.join(folder, CRITIQUE_FILE))} for ${config.paths.source}, round ${result.round}: ${critique.findings.length} finding${critique.findings.length === 1 ? "" : "s"}, ${revise} to fix before review.`);
console.log(
  result.when === "revise"
    ? "critique: revise. Go back to build, fix each finding under Fix before review, and walk the loop again. Then record the step:"
    : result.leftOpen.length > 0
      ? "critique: pass, because the rounds of revision are spent. Carry what is left open into the review note. Then record the step:"
      : "critique: pass. Carry the findings for the review note into it. Then record the step:",
);
console.log("");
console.log(`npm run loop:step -- ${traceFile} critique ${result.when}`);
console.log("");
console.log("critique: commit CRITIQUE.md with the gallery, and put this in the pull request description:");
console.log("");
console.log(critiquePullRequestMarkdown(critique, result));

/** The gallery's PNGs, as the brief and the findings name them. */
function galleryShots(dir: string): Shots {
  const pngs = (sub: string): string[] => {
    const at = path.join(dir, sub);
    return existsSync(at) && statSync(at).isDirectory()
      ? readdirSync(at)
          .filter((file) => file.endsWith(".png"))
          .sort()
          .map((file) => (sub === "" ? file : `${sub}/${file}`))
      : [];
  };
  return existsSync(path.join(dir, "before")) ? { before: pngs("before"), after: pngs("after") } : { before: [], after: pngs("") };
}

/** A path as the agent would type it: relative inside the working directory, absolute outside it. */
function relative(file: string): string {
  const name = path.relative(process.cwd(), file).split(path.sep).join("/");
  return name.startsWith("..") || path.isAbsolute(name) ? file : name;
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) fail(`missing value for ${name}.`);
  return value;
}

function fail(message: string): never {
  for (const text of message.split("\n")) console.error(`critique: ${text}`);
  process.exit(1);
}
