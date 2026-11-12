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

/** One step of a type scale: the token and its size in CSS px. */
export type ScaleStep = { readonly name: string; readonly px: number };

/**
 * The design system's type scale: its numbered font-size tokens, such as
 * Todae's `--todae-font-size-1` to `--todae-font-size-6`, smallest first. A
 * token counts when its name ends in `font-size-<n>` and is not private. When
 * more than one family of names ends that way, the one with the most steps is
 * the scale. Throws when there is no family of at least three steps.
 */
export function typeScale(css: string, privatePrefix: string): ScaleStep[] {
  const families = new Map<string, Set<string>>();
  for (const match of css.matchAll(/(--[A-Za-z0-9_-]*font-size-)(\d+)\s*:/g)) {
    const [, stem, step] = match;
    if (!stem || !step || stem.startsWith(privatePrefix)) continue;
    const names = families.get(stem) ?? new Set<string>();
    names.add(`${stem}${step}`);
    families.set(stem, names);
  }
  const ranked = [...families.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
  const best = ranked[0];
  if (!best || best[1].size < 3) {
    throw new Error("has no type scale: no family of at least three tokens named --<prefix>font-size-<n>");
  }
  const steps = [...best[1]].map((name) => ({ name, px: resolveLength(css, name, privatePrefix) }));
  steps.sort((a, b) => a.px - b.px);
  // Two tokens of one size are one step, not two.
  return steps.filter((step, index) => index === 0 || Math.abs(step.px - (steps[index - 1]?.px ?? 0)) > 0.01);
}
