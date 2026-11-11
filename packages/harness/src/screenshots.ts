import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";
import puppeteer from "puppeteer-core";
import { tryGit } from "./lib/base";
import { findChrome } from "./lib/chrome";
import { config, configName } from "./lib/config";
import { previewQueries } from "./lib/previews";
import { galleryMarkdown, pullRequestMarkdown, screenshotName } from "./lib/screenshots";

/**
 * Captures the screenshots a pull request shows: one PNG per preview the
 * product's harness.config.ts lists, the same previews check:target-size
 * opens, at 1280 by 900 in headless Chrome. `--state <name>` keeps the
 * previews of the states the change touches, and repeats. `--base <ref>` also
 * captures them at that commit, so the folder holds `before/` and `after/`.
 *
 * The folder gets a README.md that shows every image, each wrapped in a link
 * to the full-size file, so it is the gallery a reviewer opens from the pull
 * request. The script prints the lines to paste into the pull request body
 * once the folder is committed.
 */

const SCRIPT = fileURLToPath(import.meta.url);
const VIEWPORT = { width: 1280, height: 900 };

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
if (baseRef) {
  rmSync(outDir, { recursive: true, force: true });
  captureAtBase(baseRef, path.join(outDir, "before"), chrome.path);
  await capture(picked, path.join(outDir, "after"), chrome.path);
} else {
  if (!process.env.SCREENSHOTS_BASE_RUN) rmSync(outDir, { recursive: true, force: true });
  await capture(picked, outDir, chrome.path);
}

if (!process.env.SCREENSHOTS_BASE_RUN) {
  const shots = {
    before: baseRef ? pngs(path.join(outDir, "before")) : [],
    after: pngs(baseRef ? path.join(outDir, "after") : outDir),
  };
  const baseLabel = baseRef ? `${baseRef} (${tryGit(["rev-parse", "--short", `${baseRef}^{commit}`])?.trim() ?? "unknown"})` : null;
  writeFileSync(path.join(outDir, "README.md"), galleryMarkdown({ product: configName, base: baseLabel, ...shots }));
  const relative = path.relative(process.cwd(), outDir).split(path.sep).join("/");
  console.log(`screenshots: ${shots.before.length + shots.after.length} PNGs and README.md in ${relative}.`);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    console.log("screenshots: the folder is outside the repository, so there is no gallery to link from a pull request.");
  } else {
    console.log("screenshots: commit the folder and push, then put this line in the pull request body, with the pushed commit's full sha:");
    console.log("");
    console.log(pullRequestMarkdown({ repository: repositoryUrl(), commit: "<sha>", folder: relative, ...shots }));
  }
}

/** Builds the product in the working directory, serves it, and saves one full-page PNG per preview. */
async function capture(previews: readonly string[], dir: string, executablePath: string): Promise<void> {
  const web = path.resolve(config.paths.web);
  if (!existsSync(path.join(web, "index.html"))) fail(`${config.paths.web} has no index.html to build (paths.web).`);
  mkdirSync(dir, { recursive: true });
  const viteConfig = {
    root: web,
    configFile: path.resolve("vite.config.ts"),
    cacheDir: path.resolve("node_modules/.vite-screenshots"),
    logLevel: "warn" as const,
  };
  await build(viteConfig);
  let server: Awaited<ReturnType<typeof preview>>;
  try {
    server = await preview({ ...viteConfig, preview: { host: "127.0.0.1", port: 4173, strictPort: true } });
  } catch (error) {
    fail(`could not serve the built app on 127.0.0.1:4173: ${error instanceof Error ? error.message : String(error)}\nStop whatever holds port 4173, such as another npm run preview, and run it again.`);
  }
  const base = server.resolvedUrls?.local?.[0] ?? "http://127.0.0.1:4173/";
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] }).catch(async (error: unknown) => {
    await server.close();
    fail(`${executablePath} did not start: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    for (const query of previews) {
      const url = new URL(base);
      url.search = query;
      await page.goto(url.href, { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.screenshot({ path: path.join(dir, `${screenshotName(query)}.png`) as `${string}.png`, fullPage: true });
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

/**
 * Runs this script on a temporary worktree at `ref`, writing into `dir`. The
 * worktree borrows this checkout's installed packages, except the workspace
 * packages, which point at the worktree's own, so the base's harness and
 * adapter build the base's screens.
 */
function captureAtBase(ref: string, dir: string, executablePath: string): void {
  if (!/^[A-Za-z0-9._/^~-]+$/.test(ref) || ref.startsWith("-") || !tryGit(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`])) {
    fail(`--base ${ref} is not a commit in this clone. Fetch it first, such as git fetch origin main.`);
  }
  const root = mkdtempSync(path.join(os.tmpdir(), "screenshots-"));
  const worktree = path.join(root, "base");
  const added = spawnSync("git", ["worktree", "add", "--detach", "--quiet", worktree, ref], { stdio: "inherit" });
  if (added.status !== 0) fail(`could not check out ${ref} in a temporary worktree.`);
  try {
    const modules = path.resolve("node_modules");
    mkdirSync(path.join(worktree, "node_modules"));
    for (const entry of readdirSync(modules)) {
      if (entry === "@agent-design-loop") continue;
      symlinkSync(path.join(modules, entry), path.join(worktree, "node_modules", entry));
    }
    mkdirSync(path.join(worktree, "node_modules", "@agent-design-loop"));
    for (const entry of readdirSync(path.join(modules, "@agent-design-loop"))) {
      const own = readdirSync(path.join(worktree, "packages")).includes(entry) ? entry : null;
      if (own) symlinkSync(path.join(worktree, "packages", own), path.join(worktree, "node_modules", "@agent-design-loop", entry));
    }
    const args = [SCRIPT, "--config", configName, "--out", dir, ...only.flatMap((state) => ["--state", state])];
    const run = spawnSync(path.resolve("node_modules/.bin/tsx"), args, {
      cwd: worktree,
      stdio: "inherit",
      env: { ...process.env, CHROME_PATH: executablePath, SCREENSHOTS_BASE_RUN: "1" },
    });
    if (run.status !== 0) fail(`capturing ${ref} failed. Its output is above.`);
  } finally {
    spawnSync("git", ["worktree", "remove", "--force", worktree], { stdio: "ignore" });
    rmSync(root, { recursive: true, force: true });
  }
}

function pngs(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith(".png")).sort() : [];
}

/** The repository's GitHub address from the origin remote, for links pinned to a commit. */
function repositoryUrl(): string {
  const remote = tryGit(["remote", "get-url", "origin"])?.trim() ?? "";
  const match = /github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(remote);
  return match ? `https://github.com/${match[1]}/${match[2]}` : "https://github.com/<owner>/<repo>";
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
