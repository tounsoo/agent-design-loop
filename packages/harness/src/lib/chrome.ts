import { existsSync } from "node:fs";
import path from "node:path";
import { Browser, computeExecutablePath, detectBrowserPlatform } from "@puppeteer/browsers";
import { PUPPETEER_REVISIONS } from "puppeteer-core/internal/revisions.js";

/**
 * Where check:target-size and check:accessible-names find a headless Chrome.
 * `npm run setup:chrome` installs the chrome-headless-shell build that this
 * repository's puppeteer-core is tested with into `.cache/chrome`, the same
 * way locally and in CI. A Chrome at `CHROME_PATH`, or a system Chrome in the usual
 * `/usr/bin` paths, works too.
 */

/** Where Chrome is found, for the check reference. findChrome below is the code it describes. */
export const CHROME_DOC =
  "They find Chrome at `CHROME_PATH`, then the chrome-headless-shell build that `puppeteer-core` pins, which `npm run setup:chrome` installs into `.cache/chrome` (CI runs the same script), then the usual `/usr/bin` paths. A `CHROME_PATH` that names no file fails on its own. With no Chrome, the check fails, naming each place it looked and both fixes.";

/** The folder `npm run setup:chrome` installs into, from the repository root. */
export const CHROME_CACHE = ".cache/chrome";

/** The chrome-headless-shell build puppeteer-core pins. */
export const CHROME_BUILD = PUPPETEER_REVISIONS["chrome-headless-shell"];

const SYSTEM_CHROME = ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

/** The executable `npm run setup:chrome` installs, or null on a platform it has no build for. */
export function installedChromePath(cacheDir = path.resolve(CHROME_CACHE)): string | null {
  const platform = detectBrowserPlatform();
  if (platform === undefined) return null;
  return computeExecutablePath({ browser: Browser.CHROMEHEADLESSSHELL, buildId: CHROME_BUILD, cacheDir, platform });
}

export type ChromeLookup = { readonly path: string } | { readonly missing: string };

/**
 * The first Chrome found: `CHROME_PATH`, then the one `npm run setup:chrome`
 * installed, then a system Chrome. When there is none, the message says
 * where it looked and the two ways to fix it. A `CHROME_PATH` that names no
 * file is an error on its own, so a typo does not fall through to another
 * Chrome.
 */
export function findChrome(
  env: { readonly CHROME_PATH?: string | undefined } = process.env,
  exists: (file: string) => boolean = existsSync,
  installed: string | null = installedChromePath(),
): ChromeLookup {
  const fromEnv = env.CHROME_PATH?.trim();
  if (fromEnv) {
    return exists(fromEnv)
      ? { path: fromEnv }
      : { missing: `CHROME_PATH is ${fromEnv}, and there is no file there. Point it at a Chrome or Chromium binary, or unset it and run npm run setup:chrome.` };
  }
  const candidates = [...(installed ? [installed] : []), ...SYSTEM_CHROME];
  const found = candidates.find((candidate) => exists(candidate));
  if (found) return { path: found };
  return {
    missing: [
      "no headless Chrome found, and this check measures the built app in one.",
      `Looked for CHROME_PATH (unset), ${installed ? `${path.relative(process.cwd(), installed)} (npm run setup:chrome)` : `npm run setup:chrome's install (no build for this platform)`}, and ${SYSTEM_CHROME.join(", ")}.`,
      `Fix it with one of: npm run setup:chrome, which downloads chrome-headless-shell ${CHROME_BUILD} into ${CHROME_CACHE}; or CHROME_PATH=/path/to/chrome in front of the npm run that ran this check.`,
    ].join("\n"),
  };
}
