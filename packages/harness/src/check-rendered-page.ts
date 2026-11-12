import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Page } from "puppeteer-core";
import { adapter } from "./lib/adapter";
import { declarationsFile, parseDeclarations } from "./lib/accessible-names";
import { config, loadInputs } from "./lib/config";
import { loadScenarios, scenariosFile, type LoadedScenario } from "./lib/scenarios";
import {
  LIST_ITEM_STEPS_BELOW_TITLE,
  SECTION_STEPS_BELOW_TITLE,
  hex,
  largestAllowed,
  runContrast,
  sitsBelow,
  stepOf,
  type Rgba,
  type TextRun,
} from "./lib/rendered-page";
import { withServedApp } from "./lib/served-app";
import { resolveLength, scaleFrom, typeScaleTokens, type ScaleStep } from "./lib/tokens";
import { viewNamed, type View } from "./lib/views";

/**
 * Reads every scenario as Chrome paints it, the way a person sees it, and
 * holds it to five patterns that hold on any page. None is a number set per
 * page or per page type.
 *
 * 1. Hierarchy. Each page's title, its h1, sits on the design system's type
 *    scale, and every other heading on the page, a disclosure's summary
 *    included, sits at least two steps below it. A heading inside a list item
 *    or table row names a record, not a section, and sits at least one step
 *    below. The steps are the numbered font-size tokens in the adapter's
 *    stylesheet. Measured at desktop and phone width, in light.
 * 2. Reach. On a page type with a primary slot, the rank-1 action in the
 *    product's `priority` is whole inside the first view, and nothing covers
 *    its centre, at desktop and phone width, before any scroll.
 * 3. Disclosures, `<details>` with a summary a person can see, load closed,
 *    unless the scenario's state opens one: the flow's accessible-names.ts
 *    declares it `expanded: true` on that scenario. A `<details>` whose
 *    summary is hidden, like a menu a wide view always shows, is not one.
 *    A button with aria-expanded, such as a sidebar toggle, is not read.
 * 4. Contrast. Every run of text on the page, the chrome's included, meets
 *    WCAG AA against what is painted under it, in the light and the dark
 *    colour scheme, at desktop and phone width. Text in a turned-off control
 *    is exempt, as WCAG allows.
 * 5. No sideways scroll on a phone.
 */

const LABEL = "rendered page";
const problems: string[] = [];

function fail(lines: readonly string[]): never {
  for (const line of lines) console.error(`${LABEL}: ${line}`);
  process.exit(1);
}

const { scenarios, problems: scenarioProblems } = await loadScenarios(config.flows);
if (scenarioProblems.length > 0) fail(scenarioProblems);

// The names come from the stylesheet; their sizes come from Chrome, per view, so clamp(), calc() and media queries count as painted.
let scaleTokens: string[];
const tokensCss = readFileSync(adapter.tokens.css, "utf8");
try {
  scaleTokens = typeScaleTokens(tokensCss, adapter.tokens.privatePrefix);
} catch (error) {
  fail([`${adapter.tokens.css} ${error instanceof Error ? error.message : String(error)}.`]);
}
/** Each token's value as the stylesheet writes it, for a page that does not load the stylesheet, or 0 when it is not a plain length. */
const written = new Map(
  scaleTokens.map((name) => {
    try {
      return [name, resolveLength(tokensCss, name, adapter.tokens.privatePrefix)];
    } catch {
      return [name, 0];
    }
  }),
);

const { priority } = await loadInputs();
const primaryLabels = priority.filter((item) => item.rank === 1).map((item) => item.action);
const primaryPageTypes = Object.keys(config.shells.primarySlots);

/** Per scenario id, the disclosures its state opens: the names accessible-names.ts declares with `expanded: true`. */
const opened = new Map<string, Set<string>>();
for (const flow of config.flows) {
  const file = declarationsFile(flow.views);
  // check:accessible-names fails a missing or broken file; here it only means no disclosure is declared open.
  if (!existsSync(file)) continue;
  const flowIds = scenarios.filter((scenario) => scenario.file === scenariosFile(flow)).map((scenario) => scenario.id);
  let module: { accessibleNames?: unknown };
  try {
    module = (await import(pathToFileURL(path.resolve(file)).href)) as { accessibleNames?: unknown };
  } catch {
    continue;
  }
  const { declarations } = parseDeclarations(module.accessibleNames, file, flowIds);
  for (const [id, list] of Object.entries(declarations)) {
    const names = opened.get(id) ?? new Set<string>();
    for (const item of list) if (item.expanded === true && item.name !== undefined) names.add(item.name);
    opened.set(id, names);
  }
}

type Heading = { text: string; tag: string; px: number; listItem: boolean };
type Action = { name: string; top: number; bottom: number; left: number; right: number; coveredBy: string | null };
type Root = { type: string; title: { text: string; px: number } | null; headings: Heading[]; actions: Action[] };
type Reading = {
  roots: Root[];
  open: string[];
  view: { width: number; height: number };
  /** The outermost box the page lays out in that is wider than itself, or the document's own widths; container is null for the document. */
  overflow: { scrollWidth: number; clientWidth: number; container: string | null; offenders: string[] };
  runs: (Omit<TextRun, "canvas"> & { unknownBackground: boolean })[];
  canvas: Rgba;
  /** Each type-scale token's font size as Chrome computes it in this view. */
  measured: { name: string; px: number }[];
};

const desktopLight = viewNamed("desktop-light");
const desktopDark = viewNamed("desktop-dark");
const phoneLight = viewNamed("phone-light");
const phoneDark = viewNamed("phone-dark");

const hierarchy = new Map<string, Set<string>>();
let reached = 0;
let openedOnPurpose = 0;
let runsRead = 0;
let unknownRuns = 0;

await withServedApp(LABEL, config.paths.web, async (page, base) => {
  for (const scenario of scenarios) {
    const query = `scenario ${scenario.id}`;
    const desktop = await open(page, base, scenario, desktopLight, true);
    judgeHierarchy(query, desktop, desktopLight);
    judgeReach(query, desktop, desktopLight);
    judgeDisclosures(query, scenario.id, desktop, desktopLight);
    judgeContrast(query, desktop, desktopLight);
    judgeContrast(query, await open(page, base, scenario, desktopDark, true), desktopDark);
    const phone = await open(page, base, scenario, phoneLight, true);
    judgePhoneLayout(query, phone, phoneLight);
    judgeDisclosures(query, scenario.id, phone, phoneLight);
    judgeHierarchy(query, phone, phoneLight);
    judgeReach(query, phone, phoneLight);
    judgeOverflow(query, phone, phoneLight);
    judgeContrast(query, phone, phoneLight);
    judgeContrast(query, await open(page, base, scenario, phoneDark, true), phoneDark);
  }
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: desktopLight.width, height: desktopLight.height });
});

for (const [message, views] of hierarchy) problems.push(message.replace("{views}", [...views].join(" and ")));

if (problems.length > 0) fail(problems);

const primaryNote =
  primaryPageTypes.length === 0
    ? "no page type has a primary slot"
    : `${primaryLabels.map((label) => `"${label}"`).join(" or ")} is in the first view in ${reached} views`;
console.log(
  `${LABEL}: ${scenarios.length} scenarios at ${desktopLight.width} by ${desktopLight.height} and ${phoneLight.width} by ${phoneLight.height}: section headings sit ${SECTION_STEPS_BELOW_TITLE} type-scale steps below the title (list items ${LIST_ITEM_STEPS_BELOW_TITLE}), ${primaryNote}, disclosures load closed${openedOnPurpose > 0 ? ` (${openedOnPurpose} opened by their state)` : ""}, ${runsRead} runs of text meet WCAG AA in light and dark at both widths${unknownRuns > 0 ? ` (${unknownRuns} over an image, not measured)` : ""}, and nothing scrolls sideways on a phone.`,
);

async function open(page: Page, base: string, scenario: LoadedScenario, view: View, withRuns: boolean): Promise<Reading> {
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: view.scheme }]);
  await page.setViewport({ width: view.width, height: view.height, isMobile: view.mobile, hasTouch: view.mobile });
  const url = new URL(base);
  url.search = scenario.search;
  await page.goto(url.href, { waitUntil: "networkidle0" });
  return page.evaluate(readPage, { primaryLabels, primaryPageTypes, withRuns, scaleTokens });
}

function judgeHierarchy(query: string, reading: Reading, view: View): void {
  if (reading.roots.length === 0) {
    note(`${query} shows no [data-page] element, so nothing on it is a page to measure. At {views}.`, view);
    return;
  }
  let scale: ScaleStep[];
  try {
    scale = scaleFrom(reading.measured.map((step) => (step.px > 0 ? step : { name: step.name, px: written.get(step.name) ?? 0 })));
  } catch (error) {
    note(`${query}: ${adapter.tokens.css} ${error instanceof Error ? error.message : String(error)}, as Chrome computes the tokens on this page. At {views}.`, view);
    return;
  }
  for (const root of reading.roots) {
    const where = `${query}, ${root.type} page`;
    if (root.title === null) {
      note(`${where}: no visible title. The page type renders one h1 (or role="heading" at level 1), and the other headings are measured against it. At {views}.`, view);
      continue;
    }
    const title = root.title;
    for (const heading of root.headings) {
      const stepsBelow = heading.listItem ? LIST_ITEM_STEPS_BELOW_TITLE : SECTION_STEPS_BELOW_TITLE;
      if (sitsBelow(heading.px, title.px, scale, stepsBelow)) continue;
      const allowed = largestAllowed(title.px, scale, stepsBelow);
      const gap = stepOf(title.px, scale) - stepOf(heading.px, scale);
      const kind = heading.listItem ? "list item heading" : "section heading";
      const fix =
        allowed === null
          ? `the title is too low on the scale for anything to sit ${stepsBelow} steps below it`
          : `${heading.listItem ? "A heading in a list item" : "A section heading"} sits at least ${stepsBelow} ${stepsBelow === 1 ? "step" : "steps"} below the title, at ${allowed.name} (${allowed.px}px) or smaller`;
      note(
        `${where}: ${kind} ${heading.tag} "${heading.text}" is ${heading.px}px, ${gap} type-scale ${gap === 1 ? "step" : "steps"} below the title "${title.text}" (${title.px}px). ${fix}. At {views}.`,
        view,
      );
    }
  }
}

/** A view as a message about layout says it, `390 by 844`: layout is judged in light only, so the scheme adds nothing. */
function size(view: View): string {
  return `${view.width} by ${view.height}`;
}

/** Records a problem once, with every view it shows in: the message's `{views}` lists them. Layout names a view by its size, contrast by its size and scheme. */
function note(message: string, view: View, label = size(view)): void {
  const views = hierarchy.get(message) ?? new Set<string>();
  views.add(label);
  hierarchy.set(message, views);
}

function judgeReach(query: string, reading: Reading, view: View): void {
  for (const root of reading.roots) {
    if (!primaryPageTypes.includes(root.type)) continue;
    const where = `${query}, ${root.type} page, at ${size(view)}`;
    if (root.actions.length === 0) {
      problems.push(`${where}: shows no ${primaryLabels.map((label) => `"${label}"`).join(" or ")}, the rank-1 action in priority, so its reach cannot be measured.`);
      continue;
    }
    const inView = root.actions.filter(
      (action) => action.top >= -0.5 && action.left >= -0.5 && action.bottom <= reading.view.height + 0.5 && action.right <= reading.view.width + 0.5,
    );
    if (inView.some((action) => action.coveredBy === null)) {
      reached += 1;
      continue;
    }
    const covered = inView[0];
    if (covered) {
      problems.push(`${where}: "${covered.name}" is in the first view but ${covered.coveredBy} covers its centre.`);
      continue;
    }
    const action = root.actions[0];
    if (!action) continue;
    problems.push(
      `${where}: "${action.name}" is at ${Math.round(action.top)} to ${Math.round(action.bottom)} CSS px down and ${Math.round(action.left)} to ${Math.round(action.right)} across, outside the first view (${reading.view.width} by ${reading.view.height}). The primary action is in view before any scroll: pin it, or put less above it.`,
    );
  }
}

function judgeDisclosures(query: string, id: string, reading: Reading, view: View): void {
  const allowed = opened.get(id) ?? new Set<string>();
  for (const name of reading.open) {
    if (allowed.has(name)) {
      // Counted once, at desktop width.
      if (view === desktopLight) openedOnPurpose += 1;
      continue;
    }
    note(
      `${query}: the disclosure "${name}" is open on load. Disclosures load closed unless the state opens them: declare it with expanded: true on this scenario in the flow's accessible-names.ts if the state opens it on purpose. At {views}.`,
      view,
    );
  }
}

function judgeContrast(query: string, reading: Reading, view: View): void {
  const failures = new Map<string, string>();
  // Counted once, in the first reading; the others read the same runs.
  const count = view === desktopLight;
  for (const run of reading.runs) {
    if (run.unknownBackground) {
      if (count) unknownRuns += 1;
      continue;
    }
    if (count) runsRead += 1;
    const { ratio, needs, background } = runContrast({ ...run, canvas: reading.canvas });
    if (ratio >= needs) continue;
    const key = `${run.text}|${hex(run.color)}|${hex(background)}`;
    if (!failures.has(key)) {
      failures.set(key, `"${run.text}" is ${hex(run.color)} on ${hex(background)}, ${(Math.floor(ratio * 100) / 100).toFixed(2)}:1, under ${needs}:1`);
    }
  }
  if (reading.runs.length > 0 && reading.runs.every((run) => run.unknownBackground)) {
    note(
      `${query}, ${view.scheme} colour scheme: every run of text sits over a background image or gradient, so no contrast was measured. Put the page's text on a background colour. At {views}.`,
      view,
      view.label,
    );
  }
  if (failures.size === 0) return;
  const list = [...failures.values()];
  const shown = list.slice(0, 5).join("; ");
  const more = list.length > 5 ? `; and ${list.length - 5} more` : "";
  note(`${query}, ${view.scheme} colour scheme: text under WCAG AA contrast: ${shown}${more}. At {views}.`, view, view.label);
}

function judgePhoneLayout(query: string, reading: Reading, view: View): void {
  if (reading.view.width <= view.width + 1) return;
  problems.push(
    `${query}, at ${size(view)}: the page lays out ${reading.view.width} CSS px wide on a ${view.width} px phone, so everything on it is shrunk. Add <meta name="viewport" content="width=device-width, initial-scale=1"> to its index.html.`,
  );
}

function judgeOverflow(query: string, reading: Reading, view: View): void {
  const { scrollWidth, clientWidth, container, offenders } = reading.overflow;
  if (scrollWidth <= clientWidth + 1) return;
  const named = offenders.length > 0 ? ` Past the edge: ${offenders.join(", ")}.` : "";
  const what =
    container === null
      ? `the page scrolls sideways, ${scrollWidth} CSS px wide in a ${clientWidth} px view.`
      : `the page is wider than ${container}, which it lays out in: ${scrollWidth} CSS px in ${clientWidth}, so it scrolls sideways or is cut off.`;
  problems.push(`${query}, at ${size(view)}: ${what}${named}`);
}

/**
 * Runs in Chrome. Reads each page root's title, headings and rank-1 action,
 * the open disclosures, how wide the document is, and, with `withRuns`, every
 * run of text with the colours under it.
 */
function readPage(options: { primaryLabels: string[]; primaryPageTypes: string[]; withRuns: boolean; scaleTokens: string[] }): Reading {
  const collapse = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();
  const short = (value: string): string => (value.length > 60 ? `${value.slice(0, 57)}...` : value);

  /** False for an element a person cannot see: no box, hidden, see-through, clipped to a pixel, or inside a closed disclosure. */
  const shown = (element: Element): boolean => {
    if (element.getClientRects().length === 0) return false;
    if (getComputedStyle(element).visibility !== "visible") return false;
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.opacity === "0" || style.display === "none") return false;
      const box = node.getBoundingClientRect();
      if ((box.width <= 1 || box.height <= 1) && (style.overflow !== "visible" || node === element)) return false;
      const parent: Element | null = node.parentElement;
      if (parent instanceof HTMLDetailsElement && !parent.open && parent.querySelector(":scope > summary") !== node) return false;
    }
    return true;
  };

  const describe = (element: Element | null): string => {
    if (element === null) return "nothing";
    const className = typeof element.className === "string" ? element.className.split(/\s+/).find(Boolean) : undefined;
    const text = short(collapse(element.textContent));
    return `${element.tagName.toLowerCase()}${className ? `.${className}` : ""}${text ? ` "${text}"` : ""}`;
  };

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const rgba = (color: string): Rgba => {
    // Chrome computes most colours as rgb() or rgba() in sRGB: read the numbers as they are. A canvas rounds a faint tint.
    const plain = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(color);
    if (plain) {
      const alpha = plain[4] === undefined ? 1 : Number(plain[4]) / (plain[5] ? 100 : 1);
      return [Number(plain[1]), Number(plain[2]), Number(plain[3]), alpha];
    }
    if (!context) return [0, 0, 0, 1];
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "#000";
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };

  const headingLevel = (element: Element): number => {
    const tag = /^H([1-6])$/.exec(element.tagName);
    if (tag?.[1]) return Number(tag[1]);
    if (element.tagName === "SUMMARY") return 0;
    return Number(element.getAttribute("aria-level") ?? "2") || 2;
  };

  const roots = [...document.querySelectorAll("[data-page]")].filter((element) => !element.parentElement?.closest("[data-page]"));
  const viewWidth = document.documentElement.clientWidth;
  // Without a doctype, the root's client height is the document's, not the view's.
  const viewHeight = document.compatMode === "CSS1Compat" ? document.documentElement.clientHeight : window.innerHeight;
  /** What a press at a point lands on, through any open shadow roots. */
  const hitAt = (x: number, y: number): Element | null => {
    let hit = document.elementFromPoint(x, y);
    while (hit?.shadowRoot) {
      const inner = hit.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === hit) break;
      hit = inner;
    }
    return hit;
  };

  const readRoot = (root: Element): Root => {
    const type = root.getAttribute("data-page") ?? "";
    let title: Root["title"] = null;
    const headings: Heading[] = [];
    for (const element of root.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], summary")) {
      if (!shown(element)) continue;
      const px = Number.parseFloat(getComputedStyle(element).fontSize);
      const text = short(collapse(element.textContent));
      if (title === null && headingLevel(element) === 1) {
        title = { text, px };
        continue;
      }
      // A heading names a record when it sits in an item of a list or table that holds two or more: one item is a section in disguise.
      const item = element.closest("li, [role='listitem'], tr, [role='row']");
      const siblings = item?.parentElement ? [...item.parentElement.children].filter((child) => child.matches("li, [role='listitem'], tr, [role='row']")).length : 0;
      headings.push({ text, tag: element.tagName === "SUMMARY" ? "summary" : element.tagName.toLowerCase(), px, listItem: item !== null && root.contains(item) && item !== root && siblings >= 2 });
    }
    const actions: Action[] = [];
    if (options.primaryPageTypes.includes(type)) {
      const candidates = root.querySelectorAll("button, a, [role='button'], [role='link'], input[type='submit'], input[type='button']");
      for (const element of candidates) {
        const labelledBy = element.getAttribute("aria-labelledby");
        const fromIds = labelledBy ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ") : null;
        const name = collapse(fromIds ?? element.getAttribute("aria-label") ?? (element instanceof HTMLInputElement ? element.value : element.textContent));
        if (!options.primaryLabels.includes(name) || !shown(element)) continue;
        const box = element.getBoundingClientRect();
        const inView = box.top >= -0.5 && box.left >= -0.5 && box.bottom <= viewHeight + 0.5 && box.right <= viewWidth + 0.5;
        const hit = inView ? hitAt(box.left + box.width / 2, box.top + box.height / 2) : null;
        const coveredBy = !inView || (hit !== null && (hit === element || element.contains(hit))) ? null : describe(hit);
        actions.push({ name, top: box.top, bottom: box.bottom, left: box.left, right: box.right, coveredBy });
      }
    }
    return { type, title, headings, actions };
  };

  const open: string[] = [];
  for (const details of document.querySelectorAll("details[open]")) {
    // A details whose summary is hidden, like a menu a wide view always shows, is not a disclosure a person can close.
    const summary = details.querySelector(":scope > summary");
    // With no summary of its own, Chrome draws one that reads "Details".
    if (!summary) {
      if (shown(details)) open.push("Details");
      continue;
    }
    if (!shown(summary)) continue;
    open.push(collapse(summary.getAttribute("aria-label") ?? summary.textContent));
  }

  // The boxes a page lays out in: the document, and each page root with its ancestors. An app shell
  // that clips or scrolls its own pane keeps the document narrow, so each is measured, outermost first.
  // A box inside the page that scrolls sideways on purpose, such as a wide table's wrapper, is not one.
  const containers: Element[] = [document.documentElement];
  for (const root of roots) {
    const chain: Element[] = [];
    for (let node: Element | null = root; node && node !== document.documentElement; node = node.parentElement) chain.unshift(node);
    for (const node of chain) if (!containers.includes(node)) containers.push(node);
  }
  const wide = containers.find((element) => element.scrollWidth > element.clientWidth + 1) ?? null;
  const offenders: string[] = [];
  if (wide) {
    const edge = wide === document.documentElement ? viewWidth : wide.getBoundingClientRect().left + wide.clientWidth;
    const past = (element: Element): boolean => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.right > edge + 1;
    };
    // Something an inner box clips or scrolls is not past the edge; the wide container's own clipping is the problem.
    const clipped = (element: Element): boolean => {
      for (let node = element.parentElement; node && node !== wide && node !== document.body; node = node.parentElement) {
        if (getComputedStyle(node).overflowX !== "visible") return true;
      }
      return false;
    };
    for (const element of wide.querySelectorAll("*")) {
      if (offenders.length >= 3) break;
      if (!past(element) || clipped(element)) continue;
      if (element.parentElement && element.parentElement !== wide && element.parentElement !== document.body && past(element.parentElement)) continue;
      offenders.push(describe(element));
    }
  }

  const runs: Reading["runs"] = [];
  if (options.withRuns) {
    const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "OPTION", "TITLE"]);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<string>();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      const text = short(collapse(node.textContent));
      if (!parent || !text || skip.has(parent.tagName)) continue;
      if (parent.closest(":disabled, [aria-disabled='true']") || !shown(parent)) continue;
      const style = getComputedStyle(parent);
      // An element's opacity fades it and everything in it, its own background included.
      const fade = (from: Element): number => {
        let product = 1;
        for (let element: Element | null = from; element; element = element.parentElement) product *= Number(getComputedStyle(element).opacity);
        return product;
      };
      const alpha = fade(parent);
      const color = rgba(style.color);
      const backgrounds: Rgba[] = [];
      let unknownBackground = false;
      for (let element: Element | null = parent; element; element = element.parentElement) {
        const layer = getComputedStyle(element);
        if (layer.backgroundImage !== "none") {
          unknownBackground = true;
          break;
        }
        const own = rgba(layer.backgroundColor);
        const background: Rgba = [own[0], own[1], own[2], own[3] * fade(element)];
        if (background[3] > 0) backgrounds.push(background);
        if (background[3] >= 0.999) break;
      }
      const run = { text, px: Number.parseFloat(style.fontSize), weight: Number(style.fontWeight) || 400, color: [color[0], color[1], color[2], color[3] * alpha] as Rgba, backgrounds, unknownBackground };
      const key = JSON.stringify(run);
      if (seen.has(key)) continue;
      seen.add(key);
      runs.push(run);
    }
  }

  // The canvas under everything: Chrome paints it dark only when the root's used colour scheme is dark.
  const computed = getComputedStyle(document.documentElement).colorScheme;
  // With no color-scheme on the root, Chrome takes the page's <meta name="color-scheme">.
  const scheme = computed === "normal" ? (document.querySelector("meta[name='color-scheme']")?.getAttribute("content") ?? "normal") : computed;
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = /\bdark\b/.test(scheme) && (prefersDark || !/\blight\b/.test(scheme));
  const page: Rgba = dark ? [18, 18, 18, 1] : [255, 255, 255, 1];

  // Each token's size as painted here: a probe inside the first page root, where a theme's tokens apply.
  const host = roots[0] ?? document.body;
  const measured = options.scaleTokens.map((name) => {
    const probe = document.createElement("span");
    probe.style.fontSize = `var(${name}, 0px)`;
    probe.style.position = "absolute";
    host.append(probe);
    const px = Number.parseFloat(getComputedStyle(probe).fontSize);
    probe.remove();
    return { name, px };
  });

  return {
    measured,
    roots: roots.map(readRoot),
    open,
    view: { width: viewWidth, height: viewHeight },
    overflow: {
      scrollWidth: wide?.scrollWidth ?? document.documentElement.scrollWidth,
      clientWidth: wide?.clientWidth ?? viewWidth,
      container: wide === null || wide === document.documentElement ? null : describe(wide).replace(/ ".*$/, ""),
      offenders,
    },
    runs,
    canvas: page,
  };
}
