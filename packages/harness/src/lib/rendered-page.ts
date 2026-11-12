import type { ScaleStep } from "./tokens";

/**
 * The arithmetic behind check:rendered-page, kept out of Chrome so Vitest can
 * test it: where a size sits on the type scale, and WCAG contrast. The check
 * reads the page in Chrome and hands the numbers here.
 */

/** How many type-scale steps a section heading sits below the page title, at least. */
export const SECTION_STEPS_BELOW_TITLE = 2;
/** How many steps a heading that repeats in a list (a record name) sits below the title, at least. */
export const LIST_ITEM_STEPS_BELOW_TITLE = 1;
/** WCAG 2.2 AA, 1.4.3: normal text. */
export const AA_NORMAL = 4.5;
/** WCAG 2.2 AA, 1.4.3: large text, 24 CSS px, or 18.66 CSS px and bold. */
export const AA_LARGE = 3;

/** Sizes within this many CSS px of a step count as that step, so rounding in Chrome never moves a step. */
const SAME_SIZE_PX = 0.5;

/** The step a size sits on: the largest step at or below it, or -1 when it is smaller than every step. */
export function stepOf(px: number, scale: readonly ScaleStep[]): number {
  let found = -1;
  for (const [index, step] of scale.entries()) if (step.px <= px + SAME_SIZE_PX) found = index;
  return found;
}

/**
 * The largest size a heading may be, given the title's size and how many steps
 * below it the heading must sit, or null when the title sits too low on the
 * scale for any step to be that far below it.
 */
export function largestAllowed(titlePx: number, scale: readonly ScaleStep[], stepsBelow: number): ScaleStep | null {
  const index = stepOf(titlePx, scale) - stepsBelow;
  return index >= 0 ? (scale[index] ?? null) : null;
}

/** True when a heading of `px` sits at least `stepsBelow` steps under a title of `titlePx`. */
export function sitsBelow(px: number, titlePx: number, scale: readonly ScaleStep[], stepsBelow: number): boolean {
  const allowed = largestAllowed(titlePx, scale, stepsBelow);
  return allowed !== null && px <= allowed.px + SAME_SIZE_PX;
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
