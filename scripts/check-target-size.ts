import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { build, preview } from "vite";
import puppeteer from "puppeteer-core";
import { adapter } from "./lib/adapter";
import { config, loadRules } from "./lib/config";
import { previewQueries } from "./lib/previews";

const { TARGET_MIN_PX } = await loadRules();

const { queries: states, problems } = await previewQueries(config.flows);
if (problems.length > 0) {
  for (const problem of problems) console.error(`target size: ${problem}`);
  process.exit(1);
}

// `--list` prints the previews and stops before Chrome, so the fixtures can test the derivation.
if (process.argv.includes("--list")) {
  for (const state of states) console.log(`target size: preview ?${state}`);
  console.log(`target size: ${states.length} previews from modeledStates.`);
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

// The product's own index.html, inside the repository, built with the repository's Vite config.
const web = path.resolve(config.paths.web);
const webFromRoot = path.relative(process.cwd(), web);
if (webFromRoot.startsWith("..") || path.isAbsolute(webFromRoot)) {
  console.error(`target size: ${config.paths.web} is outside the repository (paths.web).`);
  process.exit(1);
}
if (!existsSync(path.join(web, "index.html"))) {
  console.error(`target size: ${config.paths.web} has no index.html to build (paths.web).`);
  process.exit(1);
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter((candidate): candidate is string => Boolean(candidate));

const chrome = chromeCandidates.find((candidate) => existsSync(candidate));
if (!chrome) {
  console.error("target size: no Chrome binary found. Set CHROME_PATH.");
  process.exit(1);
}

assertButtonTokens();

const viteConfig = { root: web, configFile: path.resolve("vite.config.ts") };
await build(viteConfig);
const server = await preview({
  ...viteConfig,
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});

const base = server.resolvedUrls?.local?.[0] ?? "http://127.0.0.1:4173/";
const failures: string[] = [];

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  for (const state of states) {
    const url = new URL(base);
    url.search = state;
    await page.goto(url.href, { waitUntil: "networkidle0" });
    const summary = await page.$("[data-page] summary");
    if (summary) {
      await summary.click();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))),
      );
    }
    const boxes = await page.evaluate(collectTargets);
    const problems = undersized(boxes);
    for (const problem of problems) failures.push(`${state}: ${problem}`);
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`target size: ${failure}`);
  process.exit(1);
}

console.log(`target size: controls on ${states.length} previews meet ${TARGET_MIN_PX} CSS px (or the WCAG spacing exception).`);

function assertButtonTokens(): void {
  const css = readFileSync(adapter.tokens.css, "utf8");
  const paddingY = resolveLength(css, adapter.tokens.actionPaddingY);
  const fontSize = resolveLength(css, adapter.tokens.actionFontSize);
  const floor = fontSize + paddingY * 2;
  if (floor < TARGET_MIN_PX) {
    console.error(
      `target size: ${adapter.name} button floor is ${floor}px (font ${fontSize} + padding-y ${paddingY} * 2), under ${TARGET_MIN_PX}px.`,
    );
    process.exit(1);
  }
  console.log(`target size: button token floor ${floor}px.`);
}

function resolveLength(css: string, name: string, seen = new Set<string>()): number {
  if (seen.has(name)) throw new Error(`target size: cycle at ${name}`);
  seen.add(name);
  const match = css.match(new RegExp(`${escapeRegExp(name)}\\s*:\\s*([^;]+);`));
  if (!match?.[1]) throw new Error(`target size: missing ${name}`);
  return lengthFrom(css, match[1].trim(), seen);
}

function lengthFrom(css: string, value: string, seen: Set<string>): number {
  const fallback = value.match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*,\s*([\s\S]+)\)$/);
  if (fallback?.[1] && fallback[2]) {
    const nested = fallback[1];
    const defined = css.includes(`${nested}:`);
    if (!defined || nested.startsWith(adapter.tokens.privatePrefix)) return lengthFrom(css, fallback[2].trim(), seen);
    return resolveLength(css, nested, seen);
  }
  const variable = value.match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/);
  if (variable?.[1]) return resolveLength(css, variable[1], seen);
  const px = value.match(/^(-?[\d.]+)px$/);
  if (px?.[1]) return Number(px[1]);
  const rem = value.match(/^(-?[\d.]+)rem$/);
  if (rem?.[1]) return Number(rem[1]) * 16;
  throw new Error(`target size: cannot resolve "${value}"`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectTargets(): Box[] {
  const root = document.querySelector("[data-page]");
  if (!root) return [];
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
