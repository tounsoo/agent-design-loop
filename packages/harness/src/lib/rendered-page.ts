/**
 * The logic behind check:rendered-page, kept out of Chrome so Vitest can
 * test it: the heading structure of a page and WCAG contrast. The check
 * reads the page in Chrome and hands the facts here.
 */

/** WCAG 2.2 AA, 1.4.3: normal text. */
export const AA_NORMAL = 4.5;
/** WCAG 2.2 AA, 1.4.3: large text, 24 CSS px, or 18.66 CSS px and bold. */
export const AA_LARGE = 3;

/** One heading on a page, in document order, as a screen reader finds it. */
export type HeadingNode = {
  readonly text: string;
  /** `h2`, or `div role="heading" aria-level=2` for an element with that role. */
  readonly tag: string;
  /** 1 to 6: the tag's number, or aria-level, 2 when role="heading" has none. */
  readonly level: number;
  /** False for a heading only a screen reader reaches, such as one visually hidden. */
  readonly shown: boolean;
};

/** How a heading names itself in a message: `h2 "Vendor"`. */
function named(heading: HeadingNode): string {
  return `${heading.tag} "${heading.text}"`;
}

/** The heading level a message names: `h3`. */
function levelTag(level: number): string {
  return `h${Math.min(level, 6)}`;
}

/**
 * The page's title and what is wrong with its heading structure, the outline a
 * screen reader announces: one h1, the title, visible and first, and no level
 * skipped going down. How elements nest in the DOM does not count, since
 * browsers never shipped the HTML outline algorithm. Sizes are not read: they
 * are the design system's and the product's theme's.
 */
export function headingStructure(headings: readonly HeadingNode[]): { title: HeadingNode | null; problems: string[] } {
  const titleIndex = headings.findIndex((heading) => heading.level === 1 && heading.shown);
  const title = headings[titleIndex];
  if (title === undefined) {
    return {
      title: null,
      problems: ['no visible title. The page type renders one h1 (or role="heading" at level 1) from the design system\'s heading component, and the other headings sit under it.'],
    };
  }
  const problems: string[] = [];
  let previous: HeadingNode = title;
  for (const [index, heading] of headings.entries()) {
    if (index === titleIndex) continue;
    if (heading.level === 1) {
      problems.push(`${named(heading)} is a second h1. A page has one h1, its title "${title.text}", and every other heading is h2 to h6.`);
    } else if (index < titleIndex) {
      problems.push(`${named(heading)} comes before the title "${title.text}". The title is the page's first heading.`);
      continue;
    } else if (heading.level > previous.level + 1) {
      problems.push(`${named(heading)} skips a level: it follows ${named(previous)}, so it is ${levelTag(previous.level + 1)} or a level above.`);
    }
    previous = heading;
  }
  return { title, problems };
}

/** A colour as sRGB channels from 0 to 255 and alpha from 0 to 1. */
export type Rgba = readonly [number, number, number, number];

/** `top` painted over an opaque `bottom`. */
export function over(top: Rgba, bottom: Rgba): Rgba {
  const alpha = top[3];
  const mix = (a: number, b: number): number => a * alpha + b * (1 - alpha);
  return [mix(top[0], bottom[0]), mix(top[1], bottom[1]), mix(top[2], bottom[2]), 1];
}

/** WCAG relative luminance of an opaque colour. */
export function luminance(color: Rgba): number {
  const [r, g, b] = [color[0], color[1], color[2]].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two opaque colours, from 1 to 21. */
export function contrast(a: Rgba, b: Rgba): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** One run of text as Chrome paints it. */
export type TextRun = {
  readonly text: string;
  readonly px: number;
  readonly weight: number;
  /** The text colour, its alpha already multiplied by the opacity of the element and its ancestors. */
  readonly color: Rgba;
  /** Background colours under the text, innermost first, down to the first opaque one or the canvas. */
  readonly backgrounds: readonly Rgba[];
  /** The page's canvas, under every background. */
  readonly canvas: Rgba;
};

/** True for WCAG large text. */
export function isLarge(px: number, weight: number): boolean {
  return px >= 24 - 0.01 || (px >= 18.66 && weight >= 700);
}

/** The ratio a run reaches, and the ratio it needs. */
export function runContrast(run: TextRun): { ratio: number; needs: number; background: Rgba } {
  let background = run.canvas;
  for (const layer of [...run.backgrounds].reverse()) background = over(layer, background);
  const foreground = over(run.color, background);
  return { ratio: contrast(foreground, background), needs: isLarge(run.px, run.weight) ? AA_LARGE : AA_NORMAL, background };
}

/** A colour for a message: `#rrggbb`. */
export function hex(color: Rgba): string {
  return `#${[color[0], color[1], color[2]].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}
