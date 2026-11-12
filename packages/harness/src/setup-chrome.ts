import path from "node:path";
import { Browser, detectBrowserPlatform, install } from "@puppeteer/browsers";
import { CHROME_BUILD, CHROME_CACHE } from "./lib/chrome";

/**
 * Installs the chrome-headless-shell build puppeteer-core pins into
 * `.cache/chrome`, where check:target-size, check:accessible-names,
 * screenshots and the fixture cases that open a page look for it. CI runs this too, so a
 * local run measures in the same build. Nothing is installed system-wide.
 */

const platform = detectBrowserPlatform();
if (platform === undefined) {
  console.error(`setup:chrome: chrome-headless-shell has no build for ${process.platform} ${process.arch}. Set CHROME_PATH to a Chrome or Chromium binary instead.`);
  process.exit(1);
}

try {
  const installed = await install({ browser: Browser.CHROMEHEADLESSSHELL, buildId: CHROME_BUILD, cacheDir: path.resolve(CHROME_CACHE), platform });
  console.log(`setup:chrome: chrome-headless-shell ${CHROME_BUILD} is at ${path.relative(process.cwd(), installed.executablePath)}.`);
} catch (error) {
  console.error(`setup:chrome: could not download chrome-headless-shell ${CHROME_BUILD}: ${error instanceof Error ? error.message : String(error)}`);
  console.error("If downloads from storage.googleapis.com are blocked here, set CHROME_PATH to a Chrome or Chromium binary instead.");
  process.exit(1);
}
