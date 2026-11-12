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
import { previewQueries } from "./lib/previews";
import { APP_URL_ENV, APP_WEB_ENV, serveApp, sharedAppUrl, type ServedApp } from "./lib/served-app";
import { galleryMarkdown, pinGallery, pullRequestMarkdown, rawFolderUrl, screenshotName } from "./lib/screenshots";

/**
 * Captures the screenshots a pull request shows: one PNG per preview the
 * product's harness.config.ts lists, the same previews check:target-size
 * opens, at 1280 by 900 in headless Chrome. `--state <name>` keeps the
 * previews of the states the change touches, and repeats. `--base <ref>` also
 * captures them at that commit, so the folder holds `before/` and `after/`.
 *
 * The folder gets a README.md that shows every image, each wrapped in a link
 * to its file, so it is the gallery a reviewer opens from the pull request.
 * Once the folder is committed, `--pin <dir>` points each link at the raw PNG
 * at that commit, so a click opens the image itself, and prints the line to
 * paste into the pull request body.
 */

const SCRIPT = fileURLToPath(import.meta.url);
const VIEWPORT = { width: 1280, height: 900 };

const pinDir = flag("--pin");
if (pinDir) {
  if (["--out", "--state", "--base"].some((name) => process.argv.includes(name))) fail("--pin takes only --config: it points a committed gallery's links at their raw files and captures nothing.");
  pin(pinDir);
  process.exit(0);
}

const out = flag("--out");
if (!out) fail("give the folder to write to: --out <dir>, such as products/meridian/review/screenshots/<change>.");
const only = values("--state");
const baseRef = flag("--base");

const { queries, problems } = await previewQueries(config.flows);
if (problems.length > 0) fail(problems.join("\n"));
const unknown = only.filter((state) => !queries.some((query) => new URLSearchParams(query).get("state") === state));
if (unknown.length > 0 && !process.env.SCREENSHOTS_BASE_RUN) {
  fail(`${unknown.join(", ")} ${unknown.length === 1 ? "is not a modeled state" : "are not modeled states"} with a preview in ${configName}.`);
}
const picked = only.length === 0 ? queries : queries.filter((query) => only.includes(new URLSearchParams(query).get("state") ?? ""));

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
if (baseRef) {
  captureAtBase(baseRef, path.join(staging, "before"), chrome.path);
  await capture(picked, path.join(staging, "after"), chrome.path);
} else {
  await capture(picked, staging, chrome.path);
}
const shots = {
  before: baseRef ? pngs(path.join(staging, "before")) : [],
  after: pngs(baseRef ? path.join(staging, "after") : staging),
};
writeFileSync(path.join(staging, "README.md"), galleryMarkdown({ product: configName, base: baseRef ? labelFor(baseRef) : null, ...shots }));
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
 * Saves one full-page PNG per preview of the product in the working
 * directory: the app check:product serves, when it serves this product, or
 * one built and served here on a free port.
 */
async function capture(previews: readonly string[], dir: string, executablePath: string): Promise<void> {
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
    await page.setViewport(VIEWPORT);
    for (const query of previews) {
      const url = new URL(app.url);
      url.search = query;
      await page.goto(url.href, { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.screenshot({ path: path.join(dir, `${screenshotName(query)}.png`) as `${string}.png`, fullPage: true });
    }
  } finally {
    await browser.close();
    await app.close();
  }
}

/**
 * Runs this script, as it is in this checkout, on a temporary worktree at
 * `ref`, writing into `dir`. The base's config, flows and product code decide
 * what is built and which previews open. The worktree borrows this checkout's
 * installed packages, except the workspace packages, which point at the
 * worktree's own, so the base's harness and adapter code build the base's
 * screens.
 */
function captureAtBase(ref: string, dir: string, executablePath: string): void {
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
  mkdirSync(path.join(worktree, "node_modules", "@agent-design-loop"));
  for (const entry of readdirSync(path.join(modules, "@agent-design-loop"))) {
    if (existsSync(path.join(worktree, "packages", entry))) {
      symlinkSync(path.join(worktree, "packages", entry), path.join(worktree, "node_modules", "@agent-design-loop", entry));
    }
  }
  const args = [SCRIPT, "--config", configName, "--out", dir, ...only.flatMap((state) => ["--state", state])];
  const run = spawnSync(path.resolve("node_modules/.bin/tsx"), args, {
    cwd: worktree,
    stdio: "inherit",
    // The base builds its own app: the one check:product may serve here is this checkout's.
    env: { ...withoutSharedApp(process.env), CHROME_PATH: executablePath, SCREENSHOTS_BASE_RUN: "1" },
  });
  if (run.status !== 0) fail(`capturing ${ref} failed. Its output is above.`);
  removeWorktree();
  process.off("exit", removeWorktree);
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
