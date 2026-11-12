import { describe, expect, it } from "vitest";
import { contrast, headingStructure, hex, isLarge, over, runContrast, type HeadingNode, type Rgba } from "./rendered-page";

const WHITE: Rgba = [255, 255, 255, 1];
const BLACK: Rgba = [0, 0, 0, 1];

function h(level: number, text: string, shown = true): HeadingNode {
  return { text, tag: `h${level}`, level, shown };
}

describe("heading structure", () => {
  it("passes one h1 then h2 sections, at any size", () => {
    const { title, problems } = headingStructure([h(1, "Harbor"), h(2, "Later today"), h(3, "9:30"), h(2, "Amenities")]);
    expect(title?.text).toBe("Harbor");
    expect(problems).toEqual([]);
  });

  it("needs a visible h1", () => {
    expect(headingStructure([h(2, "Vendor")]).problems[0]).toMatch(/^no visible title/);
    expect(headingStructure([h(1, "Hidden", false), h(2, "Vendor")]).problems[0]).toMatch(/^no visible title/);
  });

  it("fails a second h1 and a heading before the title", () => {
    expect(headingStructure([h(1, "Northwind"), h(1, "Activity")]).problems).toEqual([
      'h1 "Activity" is a second h1. A page has one h1, its title "Northwind", and every other heading is h2 to h6.',
    ]);
    expect(headingStructure([h(2, "Overview"), h(1, "Northwind")]).problems).toEqual([
      'h2 "Overview" comes before the title "Northwind". The title is the page\'s first heading.',
    ]);
  });

  it("fails a skipped level going down, not going up", () => {
    expect(headingStructure([h(1, "Northwind"), h(3, "Vendor")]).problems).toEqual([
      'h3 "Vendor" skips a level: it follows h1 "Northwind", so it is h2 or a level above.',
    ]);
    expect(headingStructure([h(1, "Northwind"), h(2, "Vendor"), h(3, "Address"), h(2, "Activity")]).problems).toEqual([]);
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
