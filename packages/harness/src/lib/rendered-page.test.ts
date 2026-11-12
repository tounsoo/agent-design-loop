import { describe, expect, it } from "vitest";
import { contrast, hex, isLarge, largestAllowed, over, runContrast, sitsBelow, stepOf, type Rgba } from "./rendered-page";
import type { ScaleStep } from "./tokens";

const SCALE: ScaleStep[] = [12, 14, 16, 20, 24, 30].map((px, index) => ({ name: `--t-font-size-${index + 1}`, px }));
const WHITE: Rgba = [255, 255, 255, 1];
const BLACK: Rgba = [0, 0, 0, 1];

describe("type scale steps", () => {
  it("puts a size on the largest step at or below it", () => {
    expect(stepOf(30, SCALE)).toBe(5);
    expect(stepOf(22, SCALE)).toBe(3);
    expect(stepOf(19.8, SCALE)).toBe(3);
    expect(stepOf(10, SCALE)).toBe(-1);
  });

  it("allows a section heading two steps under a 30 px title, 20 px", () => {
    expect(largestAllowed(30, SCALE, 2)?.px).toBe(20);
    expect(sitsBelow(20, 30, SCALE, 2)).toBe(true);
    expect(sitsBelow(24, 30, SCALE, 2)).toBe(false);
    expect(sitsBelow(24, 30, SCALE, 1)).toBe(true);
  });

  it("allows nothing when the title sits too low on the scale", () => {
    expect(largestAllowed(14, SCALE, 2)).toBeNull();
    expect(sitsBelow(12, 14, SCALE, 2)).toBe(false);
  });
});

describe("contrast", () => {
  it("is 21 for black on white and 1 for one colour", () => {
    expect(contrast(BLACK, WHITE)).toBeCloseTo(21, 5);
    expect(contrast(WHITE, WHITE)).toBe(1);
  });

  it("mixes a translucent colour over what is under it", () => {
    expect(over([0, 0, 0, 0.5], WHITE).map(Math.round)).toEqual([128, 128, 128, 1]);
  });

  it("asks 3:1 of large text and 4.5:1 of the rest", () => {
    expect(isLarge(24, 400)).toBe(true);
    expect(isLarge(19, 700)).toBe(true);
    expect(isLarge(19, 400)).toBe(false);
    const grey: Rgba = [148, 148, 148, 1];
    expect(runContrast({ text: "a", px: 16, weight: 400, color: grey, backgrounds: [], canvas: WHITE }).needs).toBe(4.5);
    expect(runContrast({ text: "a", px: 30, weight: 400, color: grey, backgrounds: [], canvas: WHITE }).needs).toBe(3);
  });

  it("measures text against its backgrounds painted over the canvas", () => {
    const run = { text: "a", px: 16, weight: 400, color: WHITE, backgrounds: [[0, 0, 0, 0.5] as Rgba], canvas: WHITE };
    const { ratio, background } = runContrast(run);
    expect(hex(background)).toBe("#808080");
    expect(ratio).toBeLessThan(4.5);
  });
});
