/**
 * A vendor id is resolved in one place, openVendor, which searches every
 * vendor the session can reach. The page and the document title both call
 * it. knownVendors and previewVendors stay available for the directory and
 * for id uniqueness, and a type cannot stop a .find on either list, so the
 * check rejects that lookup in the page and the title and names openVendor.
 */

const LIST_CALL = /(knownVendors|previewVendors)\s*\([^)]*\)/g;

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
  const bound = new Map<string, string>();
  for (const match of text.matchAll(/const\s+(\w+)\s*=\s*(knownVendors|previewVendors)\s*\(/g)) {
    const name = match[1];
    const list = match[2];
    if (name && list) bound.set(name, list);
  }
  for (const match of text.matchAll(LIST_CALL)) {
    const list = match[1];
    const after = text.slice((match.index ?? 0) + match[0].length);
    const lookup = /^\s*\.\s*(find|some)\s*\(/.exec(after);
    if (list && lookup?.[1] && !used.includes(`${list}().${lookup[1]}`)) used.push(`${list}().${lookup[1]}`);
  }
  for (const [name, list] of bound) {
    if (new RegExp(`\\b${name}\\s*\\.\\s*(find|some)\\s*\\(`).test(text) && !used.includes(`${list}().${name}`)) {
      const how = new RegExp(`\\b${name}\\s*\\.\\s*(find|some)\\s*\\(`).exec(text)?.[1] ?? "find";
      used.push(`${name}.${how} (${list})`);
    }
  }
  return used;
}
