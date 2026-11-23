/**
 * Three facts the docs have stated that were not true, and the wording that
 * is. The facts live in prose GitHub and agents read, so a type cannot hold
 * them, and generating CODEOWNERS, the gallery proposal and AGENTS.md from
 * one module would hide the instructions those files are. The check names
 * the sentence to write instead.
 */

const FILE_LINK_OPENS_FULL_SIZE = /link to (?:its own|the) file/i;
const OPENS_FULL_SIZE = /opens full size/i;
const RETRACTED = /no longer|does not|doesn't|cannot|can't/i;
const RAW_HOST = /raw\.githubusercontent\.com/;

export function docsClaimProblems(files: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  for (const file of [...files.keys()].sort()) {
    const text = files.get(file) ?? "";
    if (file === "CODEOWNERS" || file.endsWith("/CODEOWNERS")) problems.push(...codeownersProblems(file, text));
    if (file === "AGENTS.md" || file.endsWith("/AGENTS.md")) problems.push(...homeCloneProblems(file, text));
    if (file.endsWith(".md")) problems.push(...galleryProblems(file, text));
  }
  return problems;
}

function codeownersProblems(file: string, text: string): string[] {
  if (!/\breview is required\b/i.test(text)) return [];
  return [
    `${file} says review is required. GitHub requests the code owner's review and blocks a merge only once branch protection requires code owner review. Say that.`,
  ];
}

function homeCloneProblems(file: string, text: string): string[] {
  const problems: string[] = [];
  for (const sentence of sentences(text)) {
    if (!/cannot clone/i.test(sentence) && !/git credential cannot/i.test(sentence)) continue;
    if (/do not|does not|don't|doesn't|no longer/i.test(sentence)) continue;
    problems.push(
      `${file} says a cloud agent cannot clone home. Use \`/agent/repos/home\` when that directory exists. Clone \`https://github.com/tounsoo/home.git\` to \`~/repos/home\` only when it is missing, and read the files through the GitHub tools only when neither checkout works.`,
    );
  }
  return problems;
}

function galleryProblems(file: string, text: string): string[] {
  const problems: string[] = [];
  for (const sentence of sentences(text)) {
    if (!FILE_LINK_OPENS_FULL_SIZE.test(sentence) || !OPENS_FULL_SIZE.test(sentence)) continue;
    if (RETRACTED.test(sentence) || RAW_HOST.test(sentence)) continue;
    problems.push(
      `${file} says a link to the file opens the image full size. A link to the file opens GitHub's page for it. Only a link to the raw PNG on raw.githubusercontent.com opens the image full size. Say that, or say the claim no longer holds.`,
    );
  }
  return problems;
}

function sentences(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence !== "");
}
