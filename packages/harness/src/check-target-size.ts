import { readFileSync } from "node:fs";
import { adapter } from "./lib/adapter";
import { config, loadRules } from "./lib/config";
import { resolveLength } from "./lib/tokens";
import { loadScenarios } from "./lib/scenarios";
import { withServedApp } from "./lib/served-app";
import { viewNamed, type View } from "./lib/views";

const { TARGET_MIN_PX } = await loadRules();

const { scenarios, problems } = await loadScenarios(config.flows);
if (problems.length > 0) {
  for (const problem of problems) console.error(`target size: ${problem}`);
  process.exit(1);
}

/** A target's size does not change with the colour scheme, so it is measured at both widths in light. */
const views: readonly View[] = [viewNamed("desktop-light"), viewNamed("phone-light")];

// `--list` prints the scenarios and stops before Chrome, so the fixtures can test them without a build.
if (process.argv.includes("--list")) {
  for (const scenario of scenarios) console.log(`target size: scenario ${scenario.id} (${scenario.state})`);
  console.log(`target size: ${scenarios.length} scenarios cover ${new Set(scenarios.map((scenario) => scenario.state)).size} modeled states.`);
  process.exit(0);
}

type Box = {
  name: string;
  tag: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

assertButtonTokens();

const failures: string[] = [];

await withServedApp("target size", config.paths.web, async (page, base) => {
  for (const view of views) {
    await page.setViewport({ width: view.width, height: view.height, isMobile: view.mobile, hasTouch: view.mobile });
    for (const scenario of scenarios) {
      const url = new URL(base);
      url.search = scenario.search;
      await page.goto(url.href, { waitUntil: "networkidle0" });
      const nextFrame = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
      const measure = async () => {
        for (const problem of undersized(await page.evaluate(collectTargets))) {
          const failure = `${scenario.id} at ${view.label}: ${problem}`;
          if (!failures.includes(failure)) failures.push(failure);
        }
      };
      const summary = await page.$("[data-page] summary");
      if (summary) {
        await summary.click();
        await nextFrame();
      }
      await measure();
      // Every other closed disclosure in the document, the chrome's included, is
      // opened on its own, measured, and closed again, so its controls are
      // measured without one open menu covering another's.
      for (const other of await page.$$("summary")) {
        const closed = await other.evaluate(
          (element) => element.parentElement instanceof HTMLDetailsElement && !element.parentElement.open && element.getClientRects().length > 0,
        );
        if (!closed) continue;
        await other.click();
        await nextFrame();
        await measure();
        await other.click();
        await nextFrame();
      }
    }
  }
});

if (failures.length > 0) {
  for (const failure of failures) console.error(`target size: ${failure}`);
  process.exit(1);
}

console.log(
  `target size: controls on ${scenarios.length} scenarios at ${views.map((view) => `${view.width} by ${view.height}`).join(" and ")}, in light, meet ${TARGET_MIN_PX} CSS px (or the WCAG spacing exception).`,
);

function assertButtonTokens(): void {
  const css = readFileSync(adapter.tokens.css, "utf8");
  const length = (name: string): number => {
    try {
      return resolveLength(css, name, adapter.tokens.privatePrefix);
    } catch (error) {
      throw new Error(`target size: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const paddingY = length(adapter.tokens.actionPaddingY);
  const fontSize = length(adapter.tokens.actionFontSize);
  const floor = fontSize + paddingY * 2;
  if (floor < TARGET_MIN_PX) {
    console.error(
      `target size: ${adapter.name} button floor is ${floor}px (font ${fontSize} + padding-y ${paddingY} * 2), under ${TARGET_MIN_PX}px.`,
    );
    process.exit(1);
  }
  console.log(`target size: button token floor ${floor}px.`);
}

/** Every control in the document: the page, and the chrome and anything else around it. */
function collectTargets(): Box[] {
  const root = document.body;
  const selector = "button, summary, a[href], input, textarea, label, [role='radio'], [role='checkbox'], [role='switch']";
  return [...root.querySelectorAll<HTMLElement>(selector)].flatMap((element) => {
    if (element instanceof HTMLInputElement && element.closest("label")) return [];
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return [];
    const name = (element.getAttribute("aria-label") || element.textContent || element.tagName).replace(/\s+/g, " ").trim();
    return [
      {
        name: name.slice(0, 80),
        tag: element.tagName.toLowerCase(),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    ];
  });
}

function undersized(boxes: Box[]): string[] {
  const problems: string[] = [];
  for (const box of boxes) {
    if (box.width >= TARGET_MIN_PX && box.height >= TARGET_MIN_PX) continue;
    const circle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const blocked = boxes.some((other) => {
      if (other === box) return false;
      const otherCircle = { x: other.x + other.width / 2, y: other.y + other.height / 2 };
      const circlesMeet = Math.hypot(circle.x - otherCircle.x, circle.y - otherCircle.y) < TARGET_MIN_PX;
      const hitsOtherBox = circleHitsBox(circle, other);
      const otherUndersized = other.width < TARGET_MIN_PX || other.height < TARGET_MIN_PX;
      return hitsOtherBox || (otherUndersized && circlesMeet);
    });
    if (blocked) {
      problems.push(
        `${box.tag} "${box.name}" is ${Math.round(box.width)}×${Math.round(box.height)} CSS px and fails the spacing exception`,
      );
    }
  }
  return problems;
}

function circleHitsBox(center: { x: number; y: number }, box: Box): boolean {
  const nearestX = Math.max(box.x, Math.min(center.x, box.x + box.width));
  const nearestY = Math.max(box.y, Math.min(center.y, box.y + box.height));
  return Math.hypot(center.x - nearestX, center.y - nearestY) < TARGET_MIN_PX / 2;
}
