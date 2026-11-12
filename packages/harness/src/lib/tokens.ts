/**
 * Reads lengths from a design system's stylesheet, the file the adapter
 * names as `tokens.css`. A token is a custom property; its value may be a
 * length or another token, with or without a fallback. A private token, one
 * whose name starts with the adapter's `privatePrefix`, falls through to its
 * fallback, the way a product that never sets it sees it.
 */

/** The token's value in CSS px. Throws with the token's name when it is missing, cyclic or not a length. */
export function resolveLength(css: string, name: string, privatePrefix: string, seen = new Set<string>()): number {
  if (seen.has(name)) throw new Error(`cycle at ${name}`);
  seen.add(name);
  const match = css.match(new RegExp(`${escapeRegExp(name)}\\s*:\\s*([^;}]+)[;}]`));
  if (!match?.[1]) throw new Error(`missing ${name}`);
  return lengthFrom(css, match[1].trim(), privatePrefix, seen);
}

function lengthFrom(css: string, value: string, privatePrefix: string, seen: Set<string>): number {
  const fallback = value.match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*,\s*([\s\S]+)\)$/);
  if (fallback?.[1] && fallback[2]) {
    const nested = fallback[1];
    const defined = css.includes(`${nested}:`);
    if (!defined || nested.startsWith(privatePrefix)) return lengthFrom(css, fallback[2].trim(), privatePrefix, seen);
    return resolveLength(css, nested, privatePrefix, seen);
  }
  const variable = value.match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/);
  if (variable?.[1]) return resolveLength(css, variable[1], privatePrefix, seen);
  const px = value.match(/^(-?[\d.]+)px$/);
  if (px?.[1]) return Number(px[1]);
  const rem = value.match(/^(-?[\d.]+)rem$/);
  if (rem?.[1]) return Number(rem[1]) * 16;
  throw new Error(`cannot resolve "${value}"`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
