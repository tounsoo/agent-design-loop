import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import designLoop from "../design-loop";
import { loopMermaid, loopProblems } from "./lib/loop";
import { scripts } from "./lib/scripts";

/**
 * Validates the design loop graph in packages/harness/design-loop.ts, then
 * checks that the diagram in docs/how-it-works.md is the one the graph draws.
 * `npm run check:loop -- --write` redraws the diagram. It takes no --config:
 * the loop is the harness's, and every product follows the same one.
 */

const args = process.argv.slice(2);
const write = args.length === 1 && args[0] === "--write";
if (args.length > 0 && !write) {
  console.error("check:loop takes no arguments but --write, which redraws the diagram in docs/how-it-works.md.");
  process.exit(1);
}

const harnessDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const doc = path.join(harnessDir, "docs", "how-it-works.md");
const docName = path.relative(process.cwd(), doc).split(path.sep).join("/");
const START = "<!-- design-loop:start, drawn by npm run check:loop -- --write -->";
const END = "<!-- design-loop:end -->";

const problems = loopProblems(designLoop, { scripts, codeowners: readFileSync("CODEOWNERS", "utf8") });
if (problems.length > 0) {
  console.error("loop: the design loop graph is not valid:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

const text = readFileSync(doc, "utf8");
const from = text.indexOf(START);
const to = text.indexOf(END);
if (from === -1 || to < from || text.indexOf(START, from + 1) !== -1) {
  console.error(`loop: ${docName} needs one diagram block between ${START} and ${END}.`);
  process.exit(1);
}
const drawn = `${START}\n\n\`\`\`mermaid\n${loopMermaid(designLoop)}\n\`\`\`\n\n`;
const current = text.slice(from, to);
if (current !== drawn) {
  if (!write) {
    console.error(`loop: the diagram in ${docName} does not match the design loop graph. Run npm run check:loop -- --write.`);
    process.exit(1);
  }
  writeFileSync(doc, text.slice(0, from) + drawn + text.slice(to));
  console.log(`loop: redrew the diagram in ${docName}.`);
}

console.log(`loop: the design loop has ${designLoop.nodes.length} nodes and ${designLoop.edges.length} edges, and ${docName} draws it.`);
