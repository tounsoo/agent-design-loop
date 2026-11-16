import { checkRepository, formatReport } from "./lib/self-correcting";

const report = checkRepository(process.cwd());
process.stdout.write(`${formatReport(report)}\n`);
if (report.problems.length > 0) {
  console.error("self: the rule table, weeds log or suppressions are not valid:");
  for (const problem of report.problems) console.error(`- ${problem}`);
  process.exit(1);
}
