/**
 * A vendor id is resolved by openVendor. The features barrel exports that and
 * vendorDirectory, and knownVendors stays in the vendors module. A search of
 * either list, or of a const taken from one, is the split this check rejects.
 */

const LISTS = "knownVendors|previewVendors|vendorDirectory";
const METHODS = "find|findIndex|findLast|filter|some";

export function previewScopeProblems(files: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  for (const file of [...files.keys()].sort()) {
    if (!isPage(file)) continue;
    const used = idLookups(files.get(file) ?? "");
    if (used.length === 0) continue;
    problems.push(
      `${file} resolves a vendor id with ${used.join(" and ")}. Open it with openVendor from products/meridian/flows/invoice-approval/vendors.ts. The page and the document title both use it, so a preview-only vendor is not looked up in previewVendors.`,
    );
  }
  return problems;
}

function isPage(file: string): boolean {
  if (file.endsWith(".test.tsx") || file.endsWith(".test.ts")) return false;
  return file.endsWith("/App.tsx") || /\/features\/.+\.tsx$/.test(file);
}

function idLookups(text: string): string[] {
  const used: string[] = [];
  const add = (label: string): void => {
    if (!used.includes(label)) used.push(label);
  };
  const bound = new Map<string, string>();
  for (const match of text.matchAll(new RegExp(`const\\s+(\\w+)\\s*=\\s*(${LISTS})\\s*\\(`, "g"))) {
    const name = match[1];
    const list = match[2];
    if (name && list) bound.set(name, list);
  }
  for (const match of text.matchAll(new RegExp(`(${LISTS})\\s*\\([^)]*\\)`, "g"))) {
    const list = match[1];
    const after = text.slice((match.index ?? 0) + match[0].length);
    const lookup = new RegExp(`^\\s*\\.\\s*(${METHODS})\\s*\\(`).exec(after);
    if (list && lookup?.[1]) add(`${list}().${lookup[1]}`);
  }
  for (const match of text.matchAll(new RegExp(`for\\s*\\(\\s*(?:const|let|var)\\s+\\w+\\s+of\\s+(${LISTS})\\s*\\(`, "g"))) {
    if (match[1]) add(`for…of ${match[1]}()`);
  }
  for (const [name, list] of bound) {
    for (const match of text.matchAll(new RegExp(`\\b${name}\\s*\\.\\s*(${METHODS})\\s*\\(`, "g"))) {
      if (match[1]) add(`${name}.${match[1]} (${list})`);
    }
    if (new RegExp(`for\\s*\\(\\s*(?:const|let|var)\\s+\\w+\\s+of\\s+${name}\\b`).test(text)) add(`for…of ${name} (${list})`);
  }
  return used;
}
