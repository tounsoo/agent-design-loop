import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { tryGit } from "./lib/base";
import { CRITIQUE_FILE, CRITIQUE_HEADING } from "./lib/critique";
import { findChrome } from "./lib/chrome";
import { config, configName } from "./lib/config";
import { loadScenarios, type LoadedScenario } from "./lib/scenarios";
import { APP_URL_ENV, APP_WEB_ENV, serveApp, sharedAppUrl, type ServedApp } from "./lib/served-app";
import { galleryMarkdown, pinGallery, pullRequestMarkdown, rawFolderUrl, screenshotName } from "./lib/screenshots";
import { isViewName, VIEW_NAMES, VIEWS, type View } from "./lib/views";

/**
 * Captures the screenshots a pull request shows: a full-page PNG of every
 * scenario the product's flows export, the ones the Chrome checks open, in
 * each of four views: 1280 by 900 and 390 by 844, light and dark, in headless
 * Chrome. `--state <name>` keeps the scenarios of the states the change
 * touches, `--scenario <id>` keeps one scenario and `--view <view>` one view;
 * each repeats. `--base <ref>` also captures them at that commit, so the
 * folder holds `before/` and `after/`. A base from before scenarios has none
 * to pair, so it takes no before shots.
 *
 * The folder gets a README.md that shows every image, each wrapped in a link
 * to its file, so it is the gallery a reviewer opens from the pull request.
 * Once the folder is committed, `--pin <dir>` points each link at the raw PNG
 * at that commit, so a click opens the image itself, and prints the line to
 * paste into the pull request body.
 */

const SCRIPT = fileURLToPath(import.meta.url);

const pinDir = flag("--pin");
if (pinDir) {
  if (["--out", "--state", "--scenario", "--view", "--base"].some((name) => process.argv.includes(name))) fail("--pin takes only --config: it points a committed gallery's links at their raw files and captures nothing.");
  pin(pinDir);
  process.exit(0);
}

const out = flag("--out");
if (!out) fail("give the folder to write to: --out <dir>, such as products/meridian/review/screenshots/<change>.");
const onlyStates = values("--state");
const onlyScenarios = values("--scenario");
const onlyViews = values("--view");
const baseRef = flag("--base");

const badViews = onlyViews.filter((name) => !isViewName(name));
if (badViews.length > 0) fail(`${badViews.join(", ")} ${badViews.length === 1 ? "is not a view" : "are not views"}. The views are ${VIEW_NAMES.join(", ")}.`);
const views: readonly View[] = onlyViews.length === 0 ? VIEWS : VIEWS.filter((view) => onlyViews.includes(view.name));

const { scenarios, problems } = await loadScenarios(config.flows);
if (problems.length > 0) fail(problems.join("\n"));
// The base run keeps what it has: a state or scenario the change adds is not at the base.
if (!process.env.SCREENSHOTS_BASE_RUN) {
  const unknownStates = onlyStates.filter((state) => !scenarios.some((scenario) => scenario.state === state));
  if (unknownStates.length > 0) {
    fail(`${unknownStates.join(", ")} ${unknownStates.length === 1 ? "is not a modeled state" : "are not modeled states"} with a scenario in ${configName}'s flows.`);
  }
  const unknownIds = onlyScenarios.filter((id) => !scenarios.some((scenario) => scenario.id === id));
  if (unknownIds.length > 0) fail(`${unknownIds.join(", ")} ${unknownIds.length === 1 ? "is not a scenario" : "are not scenarios"} in ${configName}'s flows.`);
}
const picked = scenarios.filter(
  (scenario) => (onlyStates.length === 0 || onlyStates.includes(scenario.state)) && (onlyScenarios.length === 0 || onlyScenarios.includes(scenario.id)),
);

if (picked.length === 0 && !process.env.SCREENSHOTS_BASE_RUN) {
  fail(`No scenario in ${configName}'s flows is both of a --state and a --scenario given. Each filter keeps only what the other keeps too, so give a scenario of the state, or one filter.`);
}

const chrome = findChrome();
if ("missing" in chrome) fail(chrome.missing);

const outDir = path.resolve(out);
if (process.env.SCREENSHOTS_BASE_RUN) {
  // The run captureAtBase starts writes the before shots into the caller's staging folder.
  await capture(picked, outDir, chrome.path);
  process.exit(0);
}

// Nothing in --out is touched until every capture has succeeded: the shots go
// to a staging folder beside it, which then replaces it.
assertGallery(outDir);
mkdirSync(path.dirname(outDir), { recursive: true });
const staging = mkdtempSync(path.join(path.dirname(outDir), `.${path.basename(outDir)}-`));
process.on("exit", () => rmSync(staging, { recursive: true, force: true }));
// false when the base predates scenarios: the gallery is then laid out as one with no base, so --pin and critique read it as one.
const paired = baseRef !== undefined && captureAtBase(baseRef, path.join(staging, "before"), chrome.path);
if (baseRef !== undefined && !paired) console.log(`screenshots: ${baseRef} predates scenarios, so its screenshots would pair with none here. The gallery has no before side.`);
await capture(picked, paired ? path.join(staging, "after") : staging, chrome.path);
const shots = {
  before: paired ? pngs(path.join(staging, "before")) : [],
  after: pngs(paired ? path.join(staging, "after") : staging),
};
writeFileSync(path.join(staging, "README.md"), galleryMarkdown({ product: configName, base: paired && baseRef !== undefined ? labelFor(baseRef) : null, ...shots }));
rmSync(outDir, { recursive: true, force: true });
renameSync(staging, outDir);

const relative = path.relative(process.cwd(), outDir).split(path.sep).join("/");
console.log(`screenshots: replaced ${relative} with ${shots.before.length + shots.after.length} PNGs and README.md. Each run replaces the whole folder, so a retake repeats every flag.`);
if (relative.startsWith("..") || path.isAbsolute(relative)) {
  console.log("screenshots: the folder is outside the repository, so there is no gallery to link from a pull request.");
} else {
  console.log("screenshots: commit the folder, then point each image's link at its raw file at that commit, so a click opens it full size on a phone too:");
  console.log("");
  console.log(`npm run screenshots -- --config ${configName} --pin ${relative}`);
}

/**
 * Points each image's link in a committed gallery at its raw PNG at HEAD, and
 * prints the pull request body's line. It refuses a folder with anything but
 * its README.md uncommitted, so every link names a PNG that commit holds.
 */
function pin(dir: string): void {
  const folder = path.resolve(dir);
  const readme = path.join(folder, "README.md");
  if (!existsSync(readme) || !readFileSync(readme, "utf8").startsWith("# Screenshots\n")) {
    fail(`${dir} has no gallery README.md. Run npm run screenshots with --out ${dir} first.`);
  }
  const top = tryGit(["rev-parse", "--show-toplevel"])?.trim();
  const commit = tryGit(["rev-parse", "HEAD"])?.trim();
  if (!top || !commit) fail("--pin needs a git checkout with at least one commit.");
  // Real paths on both sides, so a folder named through a symlink is still inside the repository.
  const relative = path.relative(realpathSync(top), realpathSync(folder)).split(path.sep).join("/");
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) fail(`${dir} is outside the repository, so no commit holds its images.`);
  // -z gives each path unquoted, so a folder with a space or an accent still matches its README.md.
  const status = tryGit(["status", "--porcelain", "-z", "--untracked-files=all", "--", folder]);
  if (status === null) fail(`git status failed on ${relative}.`);
  const uncommitted = status
    .split("\0")
    .filter((entry) => entry !== "")
    .map((entry) => entry.slice(3))
    .filter((file) => file !== `${relative}/README.md`);
  if (uncommitted.length > 0) fail(`commit ${relative} first. These differ from HEAD:\n${uncommitted.map((file) => `  ${file}`).join("\n")}`);
  const repository = githubRepository();
  if (!repository) fail("the origin remote is not a GitHub repository, so there is no raw address to link.");
  const { markdown, files } = pinGallery(readFileSync(readme, "utf8"), rawFolderUrl({ ...repository, commit, folder: relative }));
  if (files.length === 0) fail(`${relative}/README.md has no linked images to pin.`);
  const missing = files.filter((file) => tryGit(["cat-file", "-e", `${commit}:${relative}/${file}`]) === null);
  if (missing.length > 0) fail(`HEAD has no ${missing.join(", ")} in ${relative}. Retake the screenshots and commit them.`);
  writeFileSync(readme, markdown);
  const shots = { before: pngs(path.join(folder, "before")), after: existsSync(path.join(folder, "before")) ? pngs(path.join(folder, "after")) : pngs(folder) };
  console.log(`screenshots: pointed ${files.length} image links in ${relative}/README.md at their raw files at ${commit.slice(0, 7)}.`);
  console.log("screenshots: commit README.md and push, then put this line in the pull request body, with the pushed commit's full sha:");
  console.log("");
  console.log(pullRequestMarkdown({ repository: `https://github.com/${repository.owner}/${repository.repo}`, commit: "<sha>", folder: relative, ...shots }));
}

/**
 * Saves a full-page PNG of each scenario in each view, of the product in the
 * working directory: the app check:product serves, when it serves this
 * product, or one built and served here on a free port.
 */
async function capture(picked: readonly LoadedScenario[], dir: string, executablePath: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const shared = sharedAppUrl(config.paths.web);
  let app: ServedApp;
  try {
    app = shared === null ? await serveApp(config.paths.web, { cacheDir: path.resolve("node_modules/.vite-screenshots") }) : { url: shared, close: async () => undefined };
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] }).catch(async (error: unknown) => {
    await app.close();
    fail(`${executablePath} did not start: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  });
  try {
    const page = await browser.newPage();
    for (const view of views) {
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: view.scheme }]);
      await page.setViewport({ width: view.width, height: view.height, isMobile: view.mobile, hasTouch: view.mobile });
      for (const scenario of picked) {
        const url = new URL(app.url);
        url.search = scenario.search;
        await page.goto(url.href, { waitUntil: "networkidle0" });
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await page.screenshot({ path: path.join(dir, `${screenshotName(scenario.id, view.name)}.png`) as `${string}.png`, fullPage: true });
      }
    }
  } finally {
    await browser.close();
    await app.close();
  }
}

/**
 * Runs this script, as it is in this checkout, on a temporary worktree at
 * `ref`, writing into `dir`, with every filter this run was given. The
 * base's config, flows, scenarios and product code decide what is built and
 * which scenarios open. It returns false, and captures nothing, when the base
 * predates scenarios. The worktree borrows this checkout's
 * installed packages, except the workspace packages, which point at the
 * worktree's own, so the base's harness and adapter code build the base's
 * screens.
 */
function captureAtBase(ref: string, dir: string, executablePath: string): boolean {
  if (!/^[A-Za-z0-9._/^~-]+$/.test(ref) || ref.startsWith("-") || !tryGit(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`])) {
    fail(`--base ${ref} is not a commit in this clone. Fetch it first, such as git fetch origin main.`);
  }
  const root = mkdtempSync(path.join(os.tmpdir(), "screenshots-"));
  const worktree = path.join(root, "base");
  const added = spawnSync("git", ["worktree", "add", "--detach", "--quiet", worktree, ref], { stdio: "inherit" });
  if (added.status !== 0) fail(`could not check out ${ref} in a temporary worktree.`);
  // fail() exits the process, so the worktree is removed on exit rather than in a finally block.
  const removeWorktree = () => {
    spawnSync("git", ["worktree", "remove", "--force", worktree], { stdio: "ignore" });
    rmSync(root, { recursive: true, force: true });
  };
  process.on("exit", removeWorktree);
  const modules = path.resolve("node_modules");
  mkdirSync(path.join(worktree, "node_modules"));
  for (const entry of readdirSync(modules)) {
    if (entry === "@agent-design-loop") continue;
    symlinkSync(path.join(modules, entry), path.join(worktree, "node_modules", entry));
  }
  if (!existsSync(path.join(worktree, "packages", "harness"))) fail(`${ref} has no packages/harness, so it predates the harness this script runs on.`);
  if (!existsSync(path.join(worktree, "packages", "harness", "src", "lib", "scenarios.ts"))) {
    removeWorktree();
    process.off("exit", removeWorktree);
    return false;
  }
  mkdirSync(path.join(worktree, "node_modules", "@agent-design-loop"));
  for (const entry of readdirSync(path.join(modules, "@agent-design-loop"))) {
    if (existsSync(path.join(worktree, "packages", entry))) {
      symlinkSync(path.join(worktree, "packages", entry), path.join(worktree, "node_modules", "@agent-design-loop", entry));
    }
  }
  const args = [
    SCRIPT,
    ...["--config", configName, "--out", dir],
    ...onlyStates.flatMap((state) => ["--state", state]),
    ...onlyScenarios.flatMap((id) => ["--scenario", id]),
    ...onlyViews.flatMap((name) => ["--view", name]),
  ];
  const run = spawnSync(path.resolve("node_modules/.bin/tsx"), args, {
    cwd: worktree,
    stdio: "inherit",
    // The base builds its own app: the one check:product may serve here is this checkout's.
    env: { ...withoutSharedApp(process.env), CHROME_PATH: executablePath, SCREENSHOTS_BASE_RUN: "1" },
  });
  if (run.status !== 0) fail(`capturing ${ref} failed. Its output is above.`);
  removeWorktree();
  process.off("exit", removeWorktree);
  return true;
}

function withoutSharedApp(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const rest = { ...env };
  delete rest[APP_URL_ENV];
  delete rest[APP_WEB_ENV];
  return rest;
}

/** The base as the gallery names it: the ref, with its short commit when the ref is a name. */
function labelFor(ref: string): string {
  const short = tryGit(["rev-parse", "--short", `${ref}^{commit}`])?.trim();
  if (!short || short.startsWith(ref) || ref.startsWith(short)) return short ?? ref;
  return `${ref} (${short})`;
}

/**
 * Fails unless `--out` is new or a folder this script wrote, which a retake
 * replaces so no stale shot is left, along with the CRITIQUE.md the critique
 * step wrote of the old shots. A folder that holds anything else, such as a
 * product's review notes, is refused, so a wrong `--out` deletes nothing.
 */
function assertGallery(dir: string): void {
  if (!existsSync(dir)) return;
  const own = (folder: string, nested: boolean): boolean =>
    readdirSync(folder, { withFileTypes: true }).every((entry) => {
      if (entry.isFile() && entry.name.endsWith(".png")) return true;
      if (!nested && entry.isFile() && entry.name === "README.md") return readFileSync(path.join(folder, entry.name), "utf8").startsWith("# Screenshots\n");
      if (!nested && entry.isFile() && entry.name === CRITIQUE_FILE) return readFileSync(path.join(folder, entry.name), "utf8").startsWith(`${CRITIQUE_HEADING}\n`);
      if (!nested && entry.isDirectory() && (entry.name === "before" || entry.name === "after")) return own(path.join(folder, entry.name), true);
      return false;
    });
  if (!statSync(dir).isDirectory() || !own(dir, false)) {
    fail(`${path.relative(process.cwd(), dir) || "."} holds files this script did not write. Give --out a new folder, such as products/<name>/review/screenshots/<change>.`);
  }
}

function pngs(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith(".png")).sort() : [];
}

/** The repository's owner and name on GitHub, from the origin remote, or null when origin is not on GitHub. */
function githubRepository(): { owner: string; repo: string } | null {
  const remote = tryGit(["remote", "get-url", "origin"])?.trim() ?? "";
  const match = /github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(remote);
  return match?.[1] && match[2] ? { owner: match[1], repo: match[2] } : null;
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) fail(`missing value for ${name}.`);
  return value;
}

function values(name: string): string[] {
  return process.argv.flatMap((arg, index) => {
    if (arg !== name) return [];
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) fail(`missing value for ${name}.`);
    return [value];
  });
}

function fail(message: string): never {
  for (const line of message.split("\n")) console.error(`screenshots: ${line}`);
  process.exit(1);
}
