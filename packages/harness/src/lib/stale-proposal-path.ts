/**
 * An example that names `proposals/NNNN-slug.md` has to name that proposal
 * or a number no proposal has. A section headed "after approval" is flagged
 * only for a path under `src/`, `scripts/` or `fixtures/`, the roots proposal
 * 0006 moved. A file the section says a later change will add is not a failure.
 */

const OLD_ROOT = /^(?:src|scripts|fixtures)(?:\/|$)/;
const PROPOSAL_FILE = /proposals\/(\d{4})-([a-z][a-z0-9-]*)\.md/g;
const PATH_TOKEN = /`((?:src|scripts|fixtures|products|packages|proposals|\.github|\.claude)\/[A-Za-z0-9_./-]*)`/g;
const ACKNOWLEDGED = /corrected|when this proposal merged|moved|lived under/;

export function staleProposalPathProblems(files: ReadonlyMap<string, string>, proposalFiles: readonly string[]): string[] {
  const problems: string[] = [];
  for (const file of [...files.keys()].sort()) {
    if (!file.startsWith("proposals/") || !file.endsWith(".md")) continue;
    const text = files.get(file) ?? "";
    problems.push(...collisions(file, text, proposalFiles));
    problems.push(...laterLandingPaths(file, text));
  }
  return problems;
}

function collisions(file: string, text: string, proposalFiles: readonly string[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(PROPOSAL_FILE)) {
    const number = match[1] ?? "";
    const named = `proposals/${number}-${match[2]}.md`;
    if (seen.has(named)) continue;
    seen.add(named);
    const sameNumber = proposalFiles.filter((proposal) => proposal.startsWith(`proposals/${number}-`));
    if (sameNumber.length === 0 || sameNumber.includes(named)) continue;
    const real = sameNumber.join(" and ");
    problems.push(
      `${file} names \`${named}\`, but proposal ${number} is \`${real}\`. Name that file, or a number no proposal has, as the proposals README's made-up examples do.`,
    );
  }
  return problems;
}

function laterLandingPaths(file: string, text: string): string[] {
  const problems: string[] = [];
  for (const section of sections(text)) {
    if (!/after approval/i.test(section.heading)) continue;
    for (const paragraph of section.body.split(/\n{2,}/)) {
      if (ACKNOWLEDGED.test(paragraph)) continue;
      const seen = new Set<string>();
      for (const match of paragraph.matchAll(PATH_TOKEN)) {
        const token = (match[1] ?? "").replace(/\/+$/, "");
        if (token === "" || seen.has(token) || token.includes("...") || !OLD_ROOT.test(token)) continue;
        seen.add(token);
        problems.push(
          `${file} names \`${token}\` where a later change lands, and that path does not exist. Name the path the repository has now. Proposal 0006 moved \`src/\`, \`scripts/\` and \`fixtures/\` to \`products/meridian/\` and \`packages/harness/\`.`,
        );
      }
    }
  }
  return problems;
}

function sections(text: string): { heading: string; body: string }[] {
  const found: { heading: string; body: string }[] = [];
  const parts = text.split(/^(#{1,6} .*)$/m);
  for (let index = 1; index < parts.length; index += 2) {
    found.push({ heading: parts[index] ?? "", body: parts[index + 1] ?? "" });
  }
  return found;
}
