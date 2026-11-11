import { existsSync } from "node:fs";
import path from "node:path";
import { build, preview } from "vite";
import puppeteer, { type Page } from "puppeteer-core";
import { findChrome } from "./chrome";
import { config } from "./config";

/**
 * Builds the product's app from `paths.web`, serves it with `vite preview` on
 * 127.0.0.1:4173, and hands `run` a headless Chrome page and the served URL.
 * The checks that read the rendered app, check:target-size and
 * check:accessible-names, share it, so they open the same build the same
 * way. Any setup failure prints a fix under the check's label and exits 1.
 */
export async function withServedApp(label: string, run: (page: Page, base: string) => Promise<void>): Promise<void> {
  const fail = (...lines: string[]): never => {
    for (const line of lines) console.error(`${label}: ${line}`);
    process.exit(1);
  };

  // The product's own index.html, inside the repository, built with the repository's Vite config.
  const web = path.resolve(config.paths.web);
  const webFromRoot = path.relative(process.cwd(), web);
  if (webFromRoot.startsWith("..") || path.isAbsolute(webFromRoot)) fail(`${config.paths.web} is outside the repository (paths.web).`);
  if (!existsSync(path.join(web, "index.html"))) fail(`${config.paths.web} has no index.html to build (paths.web).`);

  const chrome = findChrome();
  if ("missing" in chrome) return fail(chrome.missing);

  const viteConfig = { root: web, configFile: path.resolve("vite.config.ts") };
  await build(viteConfig);
  let server: Awaited<ReturnType<typeof preview>>;
  try {
    server = await preview({ ...viteConfig, preview: { host: "127.0.0.1", port: 4173, strictPort: true } });
  } catch (error) {
    return fail(
      `could not serve the built app on 127.0.0.1:4173: ${error instanceof Error ? error.message : String(error)}`,
      "Stop whatever holds port 4173, such as another npm run preview, and run the check again.",
    );
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
  try {
    browser = await puppeteer.launch({ executablePath: chrome.path, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  } catch (error) {
    await server.close();
    return fail(
      `${chrome.path} did not start: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      "A missing shared library is the usual cause on Linux. Install Chrome's system dependencies, or set CHROME_PATH to a Chrome that runs here.",
    );
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await run(page, server.resolvedUrls?.local?.[0] ?? "http://127.0.0.1:4173/");
  } finally {
    await browser.close();
    await server.close();
  }
}
