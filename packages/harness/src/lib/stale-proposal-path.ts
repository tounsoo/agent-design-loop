/**
 * A proposal that tells a later change where to land has to name a path that
 * exists, and an example that names `proposals/NNNN-slug.md` has to name that
 * proposal or a number no proposal has. Paths a merged proposal's own pull
 * request changed stay as they were: the proposals README maps `src/`,
 * `scripts/` and `fixtures/` once, and those records are not this check.
 * A type cannot tell a later-landing section from a record of a merged
 * change, so the check reads the "after approval" heading, which is the
 * section that names where a change still to come lands.
 */

const OLD_ROOT = /^(?:src|scripts|fixtures)(?:\/|$)/;
const PROPOSAL_FILE = /proposals\/(\d{4})-([a-z][a-z0-9-]*)\.md/g;
const PATH_TOKEN = /`((?:src|scripts|fixtures|products|packages|proposals|\.github|\.claude)\/[A-Za-z0-9_./-]*)`/g;
const ACKNOWLEDGED = /corrected|when this proposal merged|moved|lived under/;

export function staleProposalPathProblems(
  files: ReadonlyMap<string, string>,
  exists: (filePath: string) => boolean,
  proposalFiles: readonly string[],
): string[] {
  const problems: string[] = [];
  for (const file of [...files.keys()].sort()) {
    if (!file.startsWith("proposals/") || !file.endsWith(".md")) continue;
    const text = files.get(file) ?? "";
    problems.push(...collisions(file, text, proposalFiles));
    problems.push(...laterLandingPaths(file, text, exists));
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

function laterLandingPaths(file: string, text: string, exists: (filePath: string) => boolean): string[] {
  const problems: string[] = [];
  for (const section of sections(text)) {
    if (!/after approval/i.test(section.heading)) continue;
    for (const paragraph of section.body.split(/\n{2,}/)) {
      if (ACKNOWLEDGED.test(paragraph)) continue;
      const seen = new Set<string>();
      for (const match of paragraph.matchAll(PATH_TOKEN)) {
        const token = (match[1] ?? "").replace(/\/+$/, "");
        if (token === "" || seen.has(token) || token.includes("...")) continue;
        seen.add(token);
        if (OLD_ROOT.test(token)) {
          problems.push(
            `${file} names \`${token}\` where a later change lands, and that path does not exist. Name the path the repository has now. Proposal 0006 moved \`src/\`, \`scripts/\` and \`fixtures/\` to \`products/meridian/\` and \`packages/harness/\`.`,
          );
          continue;
        }
        if (!exists(token)) {
          problems.push(`${file} names \`${token}\` where a later change lands, and that path does not exist. Name the path the repository has now.`);
        }
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
