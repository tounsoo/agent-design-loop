import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { build, preview } from "vite";
import puppeteer, { type Page } from "puppeteer-core";
import { findChrome } from "./chrome";

/**
 * One built and served copy of a product's app, shared by every check that
 * opens it in Chrome and by the screenshots.
 *
 * `serveApp` builds the app from `paths.web` into a temporary folder and
 * serves it with `vite preview` on a free port of 127.0.0.1, so two products,
 * two checkouts or two threads never fight over a port. check:product calls
 * it once, before the first check in `APP_CHECKS` runs, and hands the address
 * to every check it runs in `HARNESS_APP_URL`, with the folder it built in
 * `HARNESS_APP_WEB`. `withServedApp` uses that app when the folder is the one
 * its own config names, and otherwise builds and serves its own, so a check
 * run on its own still works.
 */

/** The address of an app check:product already serves. */
export const APP_URL_ENV = "HARNESS_APP_URL";
/** The absolute `paths.web` folder that app was built from. */
export const APP_WEB_ENV = "HARNESS_APP_WEB";

/**
 * The checks that open the built app in Chrome, as their npm script names. A
 * check that calls `withServedApp` belongs here, so check:product builds and
 * serves the app once for all of them. One left out still passes or fails the
 * same way, building its own copy.
 */
export const APP_CHECKS: ReadonlySet<string> = new Set(["check:target-size", "check:accessible-names", "check:rendered-page"]);

/** The desktop view every check opens a preview in, in CSS px. The screenshots use it too. */
export const DESKTOP = { width: 1280, height: 900 } as const;
/** The phone view check:rendered-page opens each preview in as well, in CSS px: a common phone's width and height. */
export const PHONE = { width: 390, height: 844 } as const;

export type ServedApp = { readonly url: string; close(): Promise<void> };

/** A port nothing on 127.0.0.1 holds right now, from the operating system. */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => (typeof address === "object" && address !== null ? resolve(address.port) : reject(new Error("no port was assigned."))));
    });
  });
}

let signalsHandled = false;

/** Turns SIGINT and SIGTERM into an ordinary exit, so the exit handlers that delete a build run. */
function exitOnSignals(): void {
  if (signalsHandled) return;
  signalsHandled = true;
  process.once("SIGINT", () => process.exit(130));
  process.once("SIGTERM", () => process.exit(143));
}

/**
 * Builds the app in `web` into a temporary folder and serves it on a free
 * port. Throws with the reason when the folder has no index.html, is outside
 * the repository, or the build or server fails. `close` stops the server and
 * deletes the build.
 */
export async function serveApp(web: string, options: { cacheDir?: string } = {}): Promise<ServedApp> {
  const root = path.resolve(web);
  const fromRepo = path.relative(process.cwd(), root);
  if (fromRepo.startsWith("..") || path.isAbsolute(fromRepo)) throw new Error(`${web} is outside the repository (paths.web).`);
  if (!existsSync(path.join(root, "index.html"))) throw new Error(`${web} has no index.html to build (paths.web).`);

  const outDir = mkdtempSync(path.join(os.tmpdir(), "harness-app-"));
  // A run stopped early, by Ctrl-C, a cancelled CI job or a crash, still deletes its build.
  const removeBuild = (): void => rmSync(outDir, { recursive: true, force: true });
  process.once("exit", removeBuild);
  exitOnSignals();
  const viteConfig = {
    root,
    configFile: path.resolve("vite.config.ts"),
    logLevel: "warn" as const,
    build: { outDir, emptyOutDir: true },
    ...(options.cacheDir ? { cacheDir: options.cacheDir } : {}),
  };
  try {
    await build(viteConfig);
  } catch (error) {
    removeBuild();
    process.off("exit", removeBuild);
    throw new Error(`the app in ${web} did not build: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Another process can take the port between freePort and listen, so a taken port is tried again with a new one.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const port = await freePort();
    try {
      const server = await preview({ ...viteConfig, preview: { host: "127.0.0.1", port, strictPort: true } });
      return {
        url: server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${port}/`,
        close: async () => {
          await server.close();
          removeBuild();
          process.off("exit", removeBuild);
        },
      };
    } catch (error) {
      lastError = error;
    }
  }
  removeBuild();
  process.off("exit", removeBuild);
  throw new Error(`could not serve the built app on 127.0.0.1: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

/** The app check:product serves for `web`, or null when it serves none or one built from another folder. */
export function sharedAppUrl(web: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const url = env[APP_URL_ENV];
  const builtFrom = env[APP_WEB_ENV];
  if (!url || !builtFrom) return null;
  return path.resolve(builtFrom) === path.resolve(web) ? url : null;
}

/**
 * Hands `run` a headless Chrome page at 1280 by 900 (`DESKTOP`) and the
 * address of the product's app: the one check:product serves, or one built
 * and served here on a free port. Any setup failure prints a fix under the
 * check's label and exits 1.
 *
 * Every document the page loads gets a `__name` that returns its argument.
 * tsx compiles a named inner function as `__name(fn, "name")`, a helper that
 * lives in Node, so without it a function passed to `page.evaluate` that
 * names one of its own throws in Chrome.
 */
export async function withServedApp(label: string, web: string, run: (page: Page, base: string) => Promise<void>): Promise<void> {
  const fail = (...lines: string[]): never => {
    for (const line of lines) console.error(`${label}: ${line}`);
    process.exit(1);
  };

  const chrome = findChrome();
  if ("missing" in chrome) return fail(chrome.missing);

  const shared = sharedAppUrl(web);
  let app: ServedApp;
  try {
    app = shared === null ? await serveApp(web) : { url: shared, close: async () => undefined };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
  try {
    browser = await puppeteer.launch({ executablePath: chrome.path, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  } catch (error) {
    await app.close();
    return fail(
      `${chrome.path} did not start: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      "A missing shared library is the usual cause on Linux. Install Chrome's system dependencies, or set CHROME_PATH to a Chrome that runs here.",
    );
  }

  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument("globalThis.__name = (fn) => fn");
    await page.setViewport(DESKTOP);
    await run(page, app.url);
  } finally {
    await browser.close();
    await app.close();
  }
}
